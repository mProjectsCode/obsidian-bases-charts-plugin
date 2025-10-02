const csv = Bun.file('exampleData/penguins.csv');

const text = await csv.text();

const lines = text.split('\n').slice(1);
const data = lines.map(line => {
	const [species, island, culmen_length_mm, culmen_depth_mm, flipper_length_mm, body_mass_g, sex] = line.split(',').map(value => value.trim());
	return { species, island, culmen_length_mm, culmen_depth_mm, flipper_length_mm, body_mass_g, sex };
});

console.log(`Found ${data.length} entries`);

let i = 0;
for (const entry of data) {
	const content = `---
species: ${entry.species}
island: ${entry.island}
culmen_length_mm: ${entry.culmen_length_mm}
culmen_depth_mm: ${entry.culmen_depth_mm}
flipper_length_mm: ${entry.flipper_length_mm}
body_mass_g: ${entry.body_mass_g}
sex: ${entry.sex}
---`;

	const file = Bun.file(`exampleVault/penguins/${i}.md`);
	await file.write(content);

	i++;
}

export {};
