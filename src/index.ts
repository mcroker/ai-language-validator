import { extractFiles } from "./extractFiles"
import { ResultStore } from "./ResultsStore"
import { runAI } from "./runAI";

(async () => {
    switch (process.argv[2]) {
        case 'ai':
            await runAI(20)
            break;
        case 'extract':
            await extractFiles()
            break;
        case 'print':
            const s = new ResultStore()
            await s.load()
            console.log(s.getResults().filter(i => (i.aiConsistencyScore !== 5 || i.aiTranslationScore !== 5) && i.aiResultAvailable))
            break;
        default:
            console.error('usage: index.js (ai|extract|print)')
    }
})()