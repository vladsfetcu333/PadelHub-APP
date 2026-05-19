import 'dotenv/config';
import { retrieveRelevantChunks } from '../../src/lib/rag/retriever.js';

const queries = [
  'Ce rachetă să-mi iau ca începător?',
  'Care e diferența dintre o rachetă rotundă și una diamant?',
  'De ce nu pot juca cu pantofi de tenis?',
  'Cât costă o rachetă bună?',
];

for (const q of queries) {
  console.log(`\n── "${q}" ──`);
  const hits = await retrieveRelevantChunks(q, 3);
  for (const h of hits) {
    console.log(
      `  ${h.similarity.toFixed(3)}  [${h.category}/${h.source}]  ${h.content.slice(0, 80).replace(/\s+/g, ' ')}…`,
    );
  }
}
