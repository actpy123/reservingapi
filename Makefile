build:
	rm -rf ./dist
	cd backend && npm install --force && rm -rf ./dist && npm run build && cp -r ./dist ../dist && cp -r ./node_modules ../dist
	mkdir ./dist/public
	cd frontend && npm run build && cp -r ./dist/* ../dist/public
	