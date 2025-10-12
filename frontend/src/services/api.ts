const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "https://reserve.actpy.com/api/reserve";

export interface Assumption {
  name: string;
  data: any[];
  assumptionId: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface ReserveCalculationResult {
  skippedPolicies: number;
  successfulPolicies: number;
  outputFile?: string;
  cashflows?: string;
}

export interface Scenario {
  scenarioCode: string;
  data: { [key: string]: any }[];
}

export class ApiService {
  static async getAssumptions(): Promise<Assumption[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/assumptions`);
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      const result: ApiResponse<{ files: Assumption[] }> =
        await response.json();
      const files = result.data?.files || [];

      return this.transformRateTables(files).sort((a, b) =>
        a.name === "product_master" ? -1 : b.name === "product_master" ? 1 : 0
      );
    } catch (error) {
      console.error("Error fetching assumptions:", error);
      throw error;
    }
  }

  static transformMortalityRates(mortalityRates: any[]): any {
    if (!Array.isArray(mortalityRates) || mortalityRates.length === 0) {
      return {};
    }

    const transformed: any = {};

    if (
      mortalityRates[0] &&
      typeof mortalityRates[0] === "object" &&
      mortalityRates[0].Age !== undefined
    ) {
      mortalityRates.forEach((rate: any) => {
        const age = parseInt(rate.Age);
        if (!isNaN(age)) {
          if (!transformed[age]) {
            transformed[age] = {};
          }
          const gender = rate.Gender || rate.gender;
          if (gender) {
            const genderKey =
              gender.toString().toLowerCase() === "male"
                ? "Male"
                : gender.toString().toLowerCase() === "female"
                ? "Female"
                : gender.toString();
            transformed[age][genderKey] =
              rate.Rate || rate.rate || rate.Value || rate.value || 0;
          }
        }
      });
    } else if (mortalityRates[0] && typeof mortalityRates[0] === "object") {
      const firstItem = mortalityRates[0];
      const keys = Object.keys(firstItem);

      const ageKey = keys.find(
        (key) =>
          key.toLowerCase().includes("age") ||
          key.toLowerCase() === "x" ||
          key.toLowerCase() === "age_x"
      );
      const genderKey = keys.find(
        (key) =>
          key.toLowerCase().includes("gender") ||
          key.toLowerCase().includes("sex") ||
          key.toLowerCase() === "y" ||
          key.toLowerCase() === "gender_y"
      );
      const rateKey = keys.find(
        (key) =>
          key.toLowerCase().includes("rate") ||
          key.toLowerCase().includes("value") ||
          key.toLowerCase().includes("qx") ||
          key.toLowerCase().includes("mortality")
      );

      if (ageKey && genderKey && rateKey) {
        mortalityRates.forEach((rate: any) => {
          const age = parseInt(rate[ageKey]);
          if (!isNaN(age)) {
            if (!transformed[age]) {
              transformed[age] = {};
            }
            const gender = rate[genderKey];
            if (gender) {
              const genderKeyFormatted =
                gender.toString().toLowerCase() === "male"
                  ? "Male"
                  : gender.toString().toLowerCase() === "female"
                  ? "Female"
                  : gender.toString();
              transformed[age][genderKeyFormatted] =
                parseFloat(rate[rateKey]) || 0;
            }
          }
        });
      } else {
        return mortalityRates;
      }
    } else {
      return mortalityRates;
    }

    return transformed;
  }

  static createBackendCompatibleRates(transformedRates: any): any[] {
    const result: any[] = [];

    Object.keys(transformedRates).forEach((age) => {
      const ageNum = parseInt(age);
      if (!isNaN(ageNum)) {
        result[ageNum] = transformedRates[age];
      }
    });

    return result;
  }

  static transformRateTables(assumptions: Assumption[]): Assumption[] {
    return assumptions.map((assumption) => {
      if (
        assumption.name &&
        (assumption.name.toLowerCase().includes("mortality") ||
          assumption.name.toLowerCase().includes("morbidity") ||
          assumption.name.toLowerCase().includes("lapse") ||
          assumption.name.toLowerCase().includes("rate") ||
          assumption.name.toLowerCase().includes("table"))
      ) {
        const transformed = this.transformMortalityRates(assumption.data);
        return {
          ...assumption,
          data: this.createBackendCompatibleRates(transformed),
        };
      }
      return assumption;
    });
  }

  static async uploadAssumptions(
    file: File
  ): Promise<{ files: Assumption[]; assumptionId: string }> {
    try {
      const formData = new FormData();
      formData.append("files", file);
      const response = await fetch(`${API_BASE_URL}/assumptions`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      const result: ApiResponse<{ files: Assumption[]; assumptionId: string }> =
        await response.json();
      if (!result.success || !result.data)
        throw new Error(result.message || "Upload failed");
      const transformedFiles = this.transformRateTables(result.data.files);

      return {
        ...result.data,
        files: transformedFiles,
      };
    } catch (error) {
      console.error("Error uploading assumptions:", error);
      throw error;
    }
  }

  static async calculateReserve(
    scenarios: Scenario[]
  ): Promise<ReserveCalculationResult> {
    try {
      const response = await fetch(`${API_BASE_URL}/reserve-calculator`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scenarios),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP error! status: ${response.status} - ${errorText}`
        );
      }
      const result: ApiResponse<ReserveCalculationResult> =
        await response.json();
      if (!result.success || !result.data)
        throw new Error(result.message || "Calculation failed");
      return result.data;
    } catch (error) {
      console.error("Error calculating reserve:", error);
      throw error;
    }
  }

  static async validateScenarioCode(scenarioCode: string): Promise<{
    isValid: boolean;
    message?: string;
    product?: any;
    availableScenarioCodes?: string[];
  }> {
    try {
      const assumptions = await this.getAssumptions();
      const productMaster = assumptions.find(
        (a) => a.name === "product_master"
      );
      if (!productMaster?.data?.length) {
        return {
          isValid: false,
          message:
            "No product_master found in assumptions. Please upload assumptions first.",
        };
      }
      const product = productMaster.data.find(
        (p) => p["Scenario Code"] === scenarioCode
      );
      if (!product) {
        const availableCodes = productMaster.data
          .map((p) => p["Scenario Code"])
          .filter(Boolean);
        return {
          isValid: false,
          message: `Invalid scenario code "${scenarioCode}"`,
          availableScenarioCodes: availableCodes,
        };
      }
      return {
        isValid: true,
        product,
      };
    } catch (error) {
      console.error("Error validating scenario:", error);
      throw error;
    }
  }

  static isValidUrl(url?: string): boolean {
    return (
      typeof url === "string" &&
      url.startsWith("http") &&
      !url.includes("undefined") &&
      url.length > 0
    );
  }

  static extractIdFromUrl(url: string): string | null {
    const match = url.match(/\/download\/(?:output|cashflow)\/(.+)$/);
    return match ? match[1] : null;
  }

  static getOutputDownloadUrl(id: string): string {
    return `${API_BASE_URL}/download/output/${id}`;
  }

  static getCashflowDownloadUrl(id: string): string {
    return `${API_BASE_URL}/download/cashflow/${id}`;
  }
}
