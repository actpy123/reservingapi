build:
	rm -rf ./dist
	# Backend build
	cd backend && \
		npm install --force && \
		rm -rf ./dist && \
		npm run build && \
		cp -r ./dist ../dist && \
		cp -r ./node_modules ../dist

	# Frontend build
	mkdir -p ./dist/public
	cd frontend && \
		npm install --force && \
		echo "VITE_API_BASE_URL=https://reserve.actpy.com/api" > .env && \
		npm run build && \
		cp -r ./dist/* ../dist/public
