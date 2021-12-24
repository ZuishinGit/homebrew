"use strict";

const fs = require("fs");
const uf = require("./util-fs");
const um = require("./util-misc");
const ub = require("./util-brew");

function checkFileContents () {
	const DIR_TO_PRIMARY_PROP = {
		"creature": [
			"monster"
		],
		"book": [
			"book",
			"bookData"
		],
		"adventure": [
			"adventure",
			"adventureData"
		],
		"magicvariant": [
			"variant"
		],
		"makebrew": [
			"makebrewCreatureTrait"
		]
	};

	um.info(`PROP_CHECK`, `Checking file contents...`);
	const results = [];
	uf.runOnDirs((dir) => {
		if (dir === "collection") return;
		if (dir === "_no-index") return;


		um.info(`PROP_CHECK`, `Checking dir "${dir}"...`);
		const dirFiles = fs.readdirSync(dir, "utf8")
			.filter(file => file.endsWith(".json"));

		dirFiles.forEach(file => {
			const json = JSON.parse(fs.readFileSync(`${dir}/${file}`, "utf-8"));
			const props = DIR_TO_PRIMARY_PROP[dir] || [dir];
			props.forEach(prop => {
				if (!json[prop]) results.push(`${dir}/${file} was missing a "${prop}" property!`);
			});
		})
	});

	if (results.length) {
		results.forEach(r => um.error(`PROP_CHECK`, r));
		throw new Error(`${results.length} file${results.length === 1 ? " was missing a primary prop!" : "s were missing primary props!"} See above for more info.`)
	}

	um.info(`PROP_CHECK`, `Complete.`);
}

function buildDeepIndex () {
	um.info(`INDEX`, `Indexing...`);
	const PATH_TIMESTAMP_INDEX = "_generated/index-timestamps.json";
	const PATH_PROP_INDEX = "_generated/index-props.json";
	const PATH_SOURCE_INDEX = "_generated/index-sources.json";
	const PATH_NAME_INDEX = "_generated/index-names.json";
	const PATH_ABBREVIATION_INDEX = "_generated/index-abbreviations.json";

	const timestampIndex = {};
	const propIndex = {};
	const sourceIndex = {};
	const nameIndex = {};
	const abbreviationIndex = {};

	function indexDir (folder) {
		if (folder === "_no-index") return;
		const files = uf.listJsonFiles(folder);

		files
			.map(file => ({
				name: file,
				contents: uf.readJSON(file)
			}))
			.forEach(file => {
				const hasMeta = !ub.FILES_NO_META[file.name];
				if (!file.contents._meta && hasMeta) {
					throw new Error(`File "${file.name}" did not have metadata!`);
				}

				if (hasMeta && !file.contents._meta.unlisted) {
					const cleanName = file.name
						.replace(/#/g, "%23");

					// Index timestamps
					timestampIndex[cleanName] = {a: file.contents._meta.dateAdded, m: file.contents._meta.dateLastModified};

					// Index props
					Object.keys(file.contents)
						.filter(it => !it.startsWith("_"))
						.forEach(k => {
							(propIndex[k] = propIndex[k] || {})[cleanName] = folder;
						});

					// Index includes
					Object.keys(file.contents._meta.includes || {})
						.forEach(k => {
							(propIndex[k] = propIndex[k] || {})[cleanName] = folder;
						});

					// Index sources
					(file.contents._meta.sources || []).forEach(src => {
						if (sourceIndex[src.json]) throw new Error(`${file.name} source "${src.json}" was already in ${sourceIndex[src.json]}`);
						sourceIndex[src.json] = cleanName;
					});

					// Index names and abbreviations
					if (file.contents._meta.sources?.length) {
						const fileName = file.name.split("/").slice(1).join("/");
						if (nameIndex[fileName] || abbreviationIndex[fileName]) throw new Error(`Filename "${fileName}" was already in the index!`);
						nameIndex[fileName] = file.contents._meta.sources.map(it => it.full).filter(Boolean);
						abbreviationIndex[cleanName] = file.contents._meta.sources.map(it => it.abbreviation).filter(Boolean);
					}
				}
			});
	}

	uf.runOnDirs((dir) => {
		if (dir === "_no-index") return;
		um.info(`INDEX`, `Indexing dir "${dir}"...`);
		indexDir(dir);
	});

	um.info(`INDEX`, `Saving timestamp index to ${PATH_TIMESTAMP_INDEX}`);
	fs.writeFileSync(`./${PATH_TIMESTAMP_INDEX}`, JSON.stringify(timestampIndex), "utf-8");

	um.info(`INDEX`, `Saving prop index to ${PATH_PROP_INDEX}`);
	fs.writeFileSync(`./${PATH_PROP_INDEX}`, JSON.stringify(propIndex), "utf-8");

	um.info(`INDEX`, `Saving source index to ${PATH_SOURCE_INDEX}`);
	fs.writeFileSync(`./${PATH_SOURCE_INDEX}`, JSON.stringify(sourceIndex), "utf-8");

	um.info(`INDEX`, `Saving name index to ${PATH_NAME_INDEX}`);
	fs.writeFileSync(`./${PATH_NAME_INDEX}`, JSON.stringify(nameIndex), "utf-8");

	um.info(`INDEX`, `Saving abbreviation index to ${PATH_ABBREVIATION_INDEX}`);
	fs.writeFileSync(`./${PATH_ABBREVIATION_INDEX}`, JSON.stringify(abbreviationIndex), "utf-8");
}

checkFileContents();
buildDeepIndex();
um.info(`INDEX`, `Complete.`);
