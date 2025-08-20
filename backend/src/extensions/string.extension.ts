declare global {
  interface String {
    capitalize(): string;
  }

  interface StringConstructor {
    Empty: string;
  }
}
Object.defineProperty(String, 'Empty', {
  value: "",
  writable: false,
  configurable: false,
  enumerable: true
});

String.prototype.capitalize = function (): string {
  return this.charAt(0).toUpperCase() + this.slice(1);
};


export { };
