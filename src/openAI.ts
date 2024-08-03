import { appendFile, readFile, writeFile } from 'fs/promises';
import OpenAI from 'openai';
import { Message, TextContentBlock, TextDeltaBlock } from 'openai/resources/beta/threads/messages';
import { Run } from 'openai/resources/beta/threads/runs/runs';
import { Thread } from 'openai/resources/beta/threads/threads';

interface KeyedEntry {
    key: number,
    en: string,
    fr: string
}

export class AIThread {

    private client?: OpenAI
    private thread?: Thread

    private getClient(): OpenAI {
        if (this.client === undefined) {
            this.client = this.client = new OpenAI({
                apiKey: process.env.OPENAI_KEY
            })
        }
        return this.client
    }

    private async getThread(): Promise<Thread> {
        if (this.thread === undefined) {
            this.thread = await this.getClient().beta.threads.create();
        }
        return this.thread
    }


    async addMessage(content: string): Promise<Message> {
        return this.getClient().beta.threads.messages.create(
            (await this.getThread()).id,
            {
                role: "user",
                content
            }
        )
    }

    async subscribe(): Promise<Run> {
        const run = this.getClient().beta.threads.runs
            .stream((await this.getThread()).id, {
                assistant_id: 'asst_vNgUoo6FjjNIs0WwuS3BReBL',
            })
            //Subscribe to streaming events and log them
            .on('event', async (event) => {
                this.log(event)
                if (event.event === 'thread.message.completed') {
                    const text = (event.data.content as TextContentBlock[]|| [])?.map(i => i.text?.value).join()
                    await writeFile(__dirname + `/../out/${(await this.getThread()).id}.txt`, text, 'utf8')
                    
                    const result: KeyedEntry[]  = JSON.parse(text.split('```')[1].substring(4))
                    const entries: KeyedEntry[] = JSON.parse(await readFile(__dirname + '/../out/entries.json', 'utf8'))
                    const merged = result.map(r => {
                        const entry = entries.find(e => e.key === r.key)
                        const mergedEntry: any = { ...r, ...entries.find(e => e.key === r.key)}
                        if (entry == undefined) {
                            mergedEntry.merge_error = 'No matching key found'
                        } else if (entry.fr !== r.fr || entry.en !== r.en ) {
                            mergedEntry.entry_fr = entry.fr
                            mergedEntry.ai_fr = r.fr
                            mergedEntry.entry_en = entry.en
                            mergedEntry.ai_en = r.en
                            mergedEntry.merge_error = 'Data fields do not match between ai and entry.json'
                        }
                        return mergedEntry
                    })
                    await writeFile(__dirname + `/../out/${(await this.getThread()).id}.json`, JSON.stringify(merged), 'utf8')
                }
            })
            .on('textDelta', (delta, snapshot) => this.log(snapshot))
            .on('messageDelta', (delta, snapshot) => {
                process.stdout.write((delta.content as TextDeltaBlock[]|| [])?.map(i => i.text?.value).join())
                this.log(snapshot)
            })
            .on('run', (run) => this.log(run))
            .on('connect', () => this.log('connect'));
        const final = await run.finalRun();
        return final
    }

    async log(message: any): Promise<void> {
        await appendFile(__dirname + `/../out/${(await this.getThread()).id}.log`, JSON.stringify(message) + '\n', 'utf8')
    }

}

(async () => {
    // saveFiles
    // printHeaders
    // combineTxns
    let aiThread = new AIThread()
    await aiThread.addMessage(`
    Creat a JSON file the format of which is based on the structure of the translations.json.
    For the first 20 rows in translations.json add:
    - a ai_comments string field describing any inconsistencies or errors with the translation, where a translation is inconsistent with how similar English has been transalted elsewhere include details of the alternative used elsewhere
    - a ai_suggestion string field providing any recommendated alternative translations, omit this field if the provided translation is good and consistent
    - a ai_error_probability numeric field (expressed as an integer percentage) containing the probability that the fr field is an incorrect or suboptimal translation from english to french for the en field
    - a ai_inconsistency_probability numeric field (expressed as an integer percentage) indicating the probability that the entry is inconsistent with how similar English phrases has been translated elsewhere in translations.json
    Ignore any placeholders in the text, these are usually indicated by {}
  `)
    await aiThread.subscribe()
  })()