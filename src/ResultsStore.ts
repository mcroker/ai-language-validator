import { readFile, writeFile } from 'fs/promises';
import { AIResponse, AIResult, AITranslation, Entry, GoodBase, isGoodBase, isGoodEntry, isTranslationCandidate } from './types';

export class ResultStore {

    private entries: Map<string, Entry> = new Map<string, Entry>()
    private results: Map<string, AIResult> = new Map<string, AIResult>()
    private num2str: Map<number, string> = new Map<number, string>()
    private str2num: Map<string, number> = new Map<string, number>()
    private nextnum: number = 0;

    async load(): Promise<void> {
        const entriesData = await readFile(__dirname + `/../working/entries.json`, 'utf8')
        const entries: Entry[] = JSON.parse(entriesData)
        this.addEntries(entries)
        try {
            const resultsData = await readFile(__dirname + `/../working/results.json`, 'utf8')
            const results: AIResult[] = JSON.parse(resultsData)
            for (const result of results) {
                this.addResult(result)
            }
        } catch (e) {
            // do nothing - revert to empty results store
        }
    }

    saveResults(): Promise<void> {
        return writeFile(__dirname + `/../working/results.json`, JSON.stringify(Array.from(this.results.values()), undefined, 4), 'utf8')
    }

    saveEntries(): Promise<void> {
        return writeFile(__dirname + `/../working/entries.json`, JSON.stringify(this.getEntries(), undefined, 4), 'utf8')
    }

    saveAITranslations(): Promise<void> {
        return writeFile(__dirname + '/../working/translations.json', JSON.stringify(this.getAITranslationSet(), undefined, 4), "utf8")
    }

    addEntries(entries: (Entry | Omit<Entry, "key">)[]) {
        entries.forEach(v => this.entries.set(`${v.fileName}-${v.propertyName}`, { ...v, key: `${v.fileName}-${v.propertyName}` }))
    }

    getEntries(): Entry[] {
        return Array.from(this.entries.values()).map(v => ({ ...v, includeForAi: isTranslationCandidate(v) }))
    }

    getResults(): AIResult[] {
        return Array.from(this.results.values())
    }

    addAIResponse(response: AIResponse) {
        const key  = this.num2str.get(response.key)
        if (key !== undefined) {
            this.addResult({
                ...response,
                key
            })
        }
    }

    addAIResponses(results: AIResponse[]) {
        results.forEach(this.addAIResponse.bind(this))
    }

    addResult(result: AIResult) {
            const entry = this.entries.get(result.key)
            if (entry) {
                let mergedEntry: any = {
                    ...entry,
                    ...result,
                    aiResultAvailable: true
                }
                if (entry.fr !== result.fr || entry.en !== result.en) {
                    mergedEntry.entryFr = entry.fr
                    mergedEntry.aiFr = result.fr
                    mergedEntry.entryEn = entry.en
                    mergedEntry.aiEn = result.en
                    mergedEntry.mergeError = 'Data fields do not match between ai and entries.json'
                }
                this.results.set(result.key, mergedEntry)
            } else {
                this.results.set(result.key, {
                    ...result,
                    aiResultAvailable: true
                })
            }   
    }

    addResults(results: AIResult[]) {
        results.forEach(this.addResult.bind(this))
    }

    private getAITranslationSet(length: number = 0, start: number = 0): { en: string, fr: string }[] {
        let entries  = this.getEntries()
            .filter(e => e.includeForAi)
            .filter(isGoodBase)
            .sort((a, b) => a.key < b.key ? -1 : 1)


        if (length !== 0 || start !== 0) {
            entries = entries.slice(start, length)
        }

        return (entries as GoodBase[]).map(i => ({ en: i.en, fr: i.fr }))
    }

    getNextAIRequestSet(length: number): AITranslation[] {
        return this.mapEntries2Translations(
            this.getEntries()
                .filter(e => e.includeForAi)
                .filter(i => this.results.get(i.key) === undefined)
                .slice(0, length)
        )
    }

    private mapEntries2Translations(entries: Entry[]): AITranslation[] {
        return entries
            .filter(isGoodEntry)
            .map(i => {
                let key = this.str2num.get(i.key)
                if (key === undefined) {
                    key = this.nextnum
                    this.nextnum += 1
                    this.str2num.set(i.key, key)
                    this.num2str.set(key, i.key)
                }
                return {
                    key,
                    en: i.en.toString(),
                    fr: i.fr.toString()
                }
            })
    }

}
