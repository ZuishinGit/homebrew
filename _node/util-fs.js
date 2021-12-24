"use strict";

const fs = require("fs");

function isDirectory (path) {
	return fs.lstatSync(path).isDirectory();
}

function readJSON (path) {
	try {
		if (fs.existsSync(path)) {
			let str = fs.readFileSync(path, "utf8");
			// Strip BOM(s)
			while (str.charCodeAt(0) === 0xFEFF) str = str.slice(1);
			return JSON.parse(str);
		} else {
			const parts = path.split(/[\\/]+/g);
			const dir = parts.slice(0, -1).join("/");
			const originalName = parts[parts.length - 1];
			const filenames = fs.readdirSync(dir, "utf8");
			const filename = filenames.find(it => it.toLowerCase() === originalName.toLowerCase());
			if (filename) return JSON.parse(fs.readFileSync(`${dir}/${filename}`, "utf8"));
			else throw new Error(`Could not find file "${path}"`);
		}
	} catch (e) {
		e.message += ` (Path: ${path})`;
		throw e;
	}
}

function listJsonFiles (dir) {
	const dirContent = fs.readdirSync(dir, "utf8")
		.map(file => `${dir}/${file}`);
	return dirContent.reduce((acc, file) => {
		if (isDirectory(file)) acc.push(...listJsonFiles(file));
		else {
			if (file.toLowerCase().endsWith(".json")) acc.push(file);
		}
		return acc;
	}, [])
}

function runOnDirs (fn) {
	fs.readdirSync(".", "utf8")
		.filter(dir => isDirectory(dir) && !dir.startsWith(".") && !dir.startsWith("_") && dir !== "node_modules")
		.forEach(dir => fn(dir));
}

function mkDirs (pathToCreate) {
	pathToCreate
		.split(/[\/]/g)
		.reduce((currentPath, folder) => {
			currentPath += `${folder}/`;
			if (!fs.existsSync(currentPath)) {
				fs.mkdirSync(currentPath);
			}
			return currentPath;
		}, "");
}

module.exports = {
	readJSON,
	listJsonFiles,
	runOnDirs,
	mkDirs
};
