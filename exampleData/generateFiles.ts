import * as fs from 'node:fs/promises';

async function generateMarkdownFiles(datasetName: string) {
	const csv = Bun.file(`exampleData/${datasetName}.csv`);
	const text = await csv.text();

	const [headerLine, ...lines] = text.split('\n').filter(Boolean);
	const properties = headerLine.split(',').map(prop => prop.trim());

	const data = lines.map(line => {
		const values = line.split(',').map(value => value.trim());
		const entry: Record<string, string> = {};
		properties.forEach((prop, idx) => {
			entry[prop] = values[idx] ?? '';
		});
		return entry;
	});

	console.log(`Found ${data.length} entries`);

	if (await fs.exists(`exampleVault/${datasetName}`)) {
		await fs.rm(`exampleVault/${datasetName}`, { recursive: true });
	}

	await fs.mkdir(`exampleVault/${datasetName}`, { recursive: true });

	let i = 0;
	for (const entry of data) {
		const yaml = Object.entries(entry)
			.map(([key, value]) => `${key}: ${value}`)
			.join('\n');
		const content = `---\n${yaml}\n---`;

		const file = Bun.file(`exampleVault/${datasetName}/${i}.md`);
		await file.write(content);

		i++;
	}
}

generateMarkdownFiles('aapl');
generateMarkdownFiles('penguins');

export {};
