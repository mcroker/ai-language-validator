import { writeFile } from "fs/promises"
import { AIThread } from "./AIThread"
import { ResultStore } from "./ResultsStore"
import { AIResponse, AIResult } from "./types"

export async function runAI(num: number = 10) {
    const store = new ResultStore()
    await store.load()

    let aiThread = new AIThread()
    const id = await aiThread.getId()

    console.log(`commencing ThreadId ${id}`)

    const source = store.getNextAIRequestSet(num)

    const msg = `
    for the source records contained in this array
    ${JSON.stringify(source, undefined, 4)}

    Create an record which contains all the fields in the source record, plus additionally: aiComments, aiSuggestion, aiTranslationScore and aiConsistency score.
    These fields are defined as
        aiComments: string         // Describes any inconsistencies or errors with the translation, omit this field if the provided translation is good and consistent
        aiSuggestion: string       // Recommendated alternative translations, omit this field if the provided translation is good and consistent
        aiTranslationScore: number // Translation Score expressed as an integer between 0 and 5 (5 indicating that the french is the best possible translation, and 0 indicating the translation is incorrect)
        aiConsistencyScore: number // Consistency Score expressed as an integer between 0 and 5 (5 indicating the translation is highly consistent with how similar english is translated in translations.json, and 0 indicating the translation is very inconsistent with how similar english is translated in translations.jsone)
    Ignore any placeholders in the text, these are usually indicated by {}
    Ingore any html in the text, html is usually included by <>
    Output as JSON
    `
    await writeFile(__dirname + `/../out/${id}_input.txt`, msg, 'utf8')

    await aiThread.addMessage(msg)
    const { result, run } = await aiThread.subscribeMessageCompletion()
    await writeFile(__dirname + `/../out/${id}_response.txt`, result, 'utf8')

    try {
        if (run.status === 'completed') {
            const json1 = result.split('```')[1]
            if (json1 !== undefined) {
                const json2 = json1.substring(4)
                const json: AIResponse[] = JSON.parse(json2)
                store.addAIResponses(json)
                await store.saveResults()
            } else {
                throw new Error('Did not find json open/close in the response - unable to parse undefined')
            }
        } else {
            console.error(run);
        }
    }
    catch (e) {
        console.error(e)
    }
    finally {
        const in_1k_cost = 0.005
        const out_1k_cost = 0.015
        const cost = (in_1k_cost / 1000 * (run.usage?.prompt_tokens || 0)) + (out_1k_cost / 1000 * (run.usage?.completion_tokens || 0))

        console.log(`processing of ThreadId ${id} completed with status=${run.status}, tokens=${run.usage?.total_tokens}, cost=${cost}`)
    }
}