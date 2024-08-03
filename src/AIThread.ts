import { appendFile, writeFile } from 'fs/promises';
import OpenAI from 'openai';
import { Message, TextContentBlock, TextDeltaBlock } from 'openai/resources/beta/threads/messages';
import { Run } from 'openai/resources/beta/threads/runs/runs';
import { Thread } from 'openai/resources/beta/threads/threads';

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

    async getId(): Promise<string> {
        return (await this.getThread()).id
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

    async subscribeMessageCompletion(): Promise<{ result: string, run: Run }> {
        const fileBase = __dirname + `/../out/${(await this.getThread()).id}`
        await writeFile(`${fileBase}_log.json`, '{\n  "events": [\n', 'utf8');

        let result = ''
        let comma = ''
        const run = this.getClient().beta.threads.runs
            .stream((await this.getThread()).id, {
                assistant_id: 'asst_vNgUoo6FjjNIs0WwuS3BReBL',
                instructions: 'You are a helpful assistant that uses the provided files to answer questions about the quality and consistency of translation between English and French.',
                model: 'gpt-4o',
                temperature: 0.1
            })
            //Subscribe to streaming events and log them
            .on('event', async (event) => {
                if (event.event !== 'thread.message.delta') {
                    await appendFile(`${fileBase}_log.json`, comma + JSON.stringify(event) + '\n', 'utf8')
                    comma = ','
                }
                if (event.event === 'thread.message.completed') {
                    result = (event.data.content as TextContentBlock[] || [])?.map(i => i.text?.value).join()
                }
            })
            // .on('textDelta', (delta, snapshot) => this.log(snapshot))
            .on('messageDelta', async (delta, snapshot) => {
                const deltaText = (delta.content as TextDeltaBlock[] || [])?.map(i => i.text?.value).join()
                appendFile(`${fileBase}_running.txt`, deltaText, 'utf8');
                process.stdout.write(deltaText)
            })
        // .on('run', (run) => this.log(run))
        // .on('connect', () => this.log('connect'));
        const finalRun = await run.finalRun();
        await appendFile(`${fileBase}_log.json`, `\n  ], "run": ${JSON.stringify(finalRun)} \n}`, 'utf8');
        process.stdout.write('\n')
        return { result, run: finalRun }
    }

}