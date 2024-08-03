import { readFile, utils } from 'xlsx';
import { ResultStore } from './ResultsStore';
import { FileDef, h, Entry } from './types';

const TYPE1 = [h.version, h.changeType, h.componentEn, h.fileName, h.propertyName, h.existingEn, h.newEn, h.commentsEn, h.existingFr, h.newFr, h.commentsFr];

const FILES: FileDef[] = [
  { srcFile: '2/Translate_CE_React Extract 2', outFile: 'CE React', headers: TYPE1 },
  { srcFile: '2/Translate_UIM_ Extract 2', outFile: 'UIM', headers: [h.version, h.changeType, h.fileName, h.propertyName, h.pathEn, h.componentEn, h.existingEn, h.newEn, h.commentsEn, h.pathFr, h.componentFr, h.existingFr, h.newFr, h.commentsFr] },
  { srcFile: '2/Translate_Rules_Extract 2', outFile: 'Rules', headers: [h.version, h.changeType, h.componentEn, h.pathEn, h.fileName, h.propertyName, h.existingEn, h.newEn, h.commentsEn, h.existingFr, h.newFr, h.commentsFr] },
  { srcFile: '2/Translate_Navigation_Extract 2', outFile: 'Navigation', headers: [h.version, h.changeType, h.componentEn, h.pathEn, h.fileName, h.propertyName, h.existingEn, h.newEn, h.commentsEn, h.existingFr, h.newFr, h.commentsFr] },
  { srcFile: '2/Translate_Messages _ Extract 2', outFile: 'Messages', headers: TYPE1 },
  { srcFile: '2/Translate_IEG_Extract 2', outFile: 'IEG', headers: TYPE1 },
  { srcFile: '2/Code tables Extract 2', sheetName: 'Sheet1', outFile: 'Code Tables', headers: TYPE1 },
  { srcFile: '2/Extract CE React _ Translated 20240207_ CLarifications', sheetName: 'Sheet1', outFile: 'CE React 2', headers: TYPE1 },
  { srcFile: '2/DMX_Workflow Extract 2', outFile: 'DMX Workflow', headers: [h.version, h.changeType, h.componentEn, h.fileName, 'TagType', 'SubTagType', h.propertyName, h.existingEn, h.newEn, h.commentsEn, h.existingFr, h.newFr, h.commentsFr] },
  { disabled: true, srcFile: '2/Translate_Blob_Extract 2', outFile: 'Blob', headers: TYPE1 },
]

export async function extractFiles() {
  const store = new ResultStore()
  await store.load()
  await Promise.all(FILES.filter(f => f.disabled !== true).map(f => extractFileData(f).then(txns => store.addEntries(txns))))
  await Promise.all([store.saveEntries(), store.saveAITranslations()])
}

export async function printHeaders() {
  await Promise.all(FILES.filter(f => f.disabled === false).map(printHeader))
}

async function extractFileData(options: FileDef): Promise<(Omit<Entry, "key">)[]> {
  const data = await getXlsJson(options)
  const mapper = (options.mapper) ? options.mapper : defaultMapper;
  const result: (Omit<Entry, "key">)[] = []
  for (const x of data as any) {
    const row = mapper(x);
    if (!(x['Version'] == 'DO NOT EDIT' || x['Version'] == 'Version')) {
      result.push(row)
    }
  }
  return result
}

function defaultMapper(x: any): Omit<Entry, "key"> {
  return {
    fileName: x[h.fileName],
    path: x[h.pathEn],
    propertyName: x[h.propertyName],
    component: x[h.componentEn],
    en: (x[h.newEn] && String(x[h.newEn]).trim() !== '') ? String(x[h.newEn]).trim().toString() : String(x[h.existingEn]).trim().toString(),
    fr: (x[h.newFr] && String(x[h.newFr]).trim() !== '') ? String(x[h.newFr]).trim().toString() : String(x[h.existingFr]).trim().toString(),
  }
}


async function getXlsJson(options: FileDef): Promise<any> {
  const file = await readFile(__dirname + '/../extracts/' + options.srcFile + '.xlsx', { sheetRows: options.sheetRows })
  const sheetName = (options.sheetName) ? options.sheetName : 'TO BE PROCESSED';
  const data = utils.sheet_to_json(file.Sheets[sheetName], {
    header: options.headers
  })
  return data
}


async function printHeader(options: FileDef): Promise<void> {
  const data = await getXlsJson({ ...options, sheetRows: 2 })
  for (const x of data as any) {
    if (x['Version'] == 'Version') {
      console.log({
        srcFile: options.srcFile,
        outFile: options.outFile,
        ...x
      })
    }
  }
}
