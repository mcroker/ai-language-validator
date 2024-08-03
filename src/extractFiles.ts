import { writeFile } from 'fs/promises';
import { readFile, utils } from 'xlsx';

enum h {
  version = 'Version',
  changeType = 'ChangeType',

  fileName = 'FileName',
  propertyName = 'PropertyName',

  componentEn = 'ComponentEn',
  pathEn = 'PathForEn',
  existingEn = 'ExistingEn',
  newEn = 'NewEn',
  commentsEn = 'CommentsEn',

  componentFr = 'ComponentFr',
  pathFr = 'PathForFr',
  existingFr = 'ExistingFr',
  newFr = 'NewFr',
  commentsFr = 'CommentsFr'
}

interface AITranslation {
  key: number,
  en: String,
  fr: String
}

interface Translation {
  key?: number,
  fileName?: string,
  path?: string,
  propertyName?: string,
  component?: string,
  en?: String,
  fr?: String
}

type MapperFn = (x: any) => Translation;

interface FileDef {
  disabled?: boolean,
  srcFile: string,
  outFile: string,
  sheetName?: string,
  sheetRows?: number,
  mapper?: MapperFn,
  headers?: string[]
}

function defaultMapper(x: any): Translation {
  return {
    fileName: x[h.fileName],
    path: x[h.pathEn],
    propertyName: x[h.propertyName],
    component: x[h.componentEn],
    en: (x[h.newEn] && String(x[h.newEn]).trim() !== '') ? String(x[h.newEn]).trim() : String(x[h.existingEn]).trim(),
    fr: (x[h.newFr] && String(x[h.newFr]).trim() !== '') ? String(x[h.newFr]).trim() : String(x[h.existingFr]).trim(),
  }
}

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

export async function getXlsJson(options: FileDef): Promise<any> {
  const file = await readFile(__dirname + '/../extracts/' + options.srcFile + '.xlsx', { sheetRows: options.sheetRows })
  const sheetName = (options.sheetName) ? options.sheetName : 'TO BE PROCESSED';
  const data = utils.sheet_to_json(file.Sheets[sheetName], {
    header: options.headers
  })
  return data
}

export async function extractFileData(options: FileDef): Promise<Translation[]> {
  const data = await getXlsJson(options)
  const mapper = (options.mapper) ? options.mapper : defaultMapper;
  const result: Translation[] = []
  for (const x of data as any) {
    const row = mapper(x);
    if (!(x['Version'] == 'DO NOT EDIT' || x['Version'] == 'Version')) {
      result.push(row)
    }
  }
  return result
}

export async function printHeader(options: FileDef): Promise<void> {
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

export async function saveFile(options: FileDef) {
  await writeFile(__dirname + '/../out/' + options.outFile + '.json', JSON.stringify(await extractFileData(options)))
}

export function isGoodTranslation(txn: Translation): txn is Translation & AITranslation {
  if (typeof txn.key !== 'number') return false
  if (txn.en === undefined || txn.fr === undefined || txn.en.length === 0 || txn.fr.length === 0) return false
  const fr = txn.fr.toLowerCase()
  return fr !== 'undefined' && fr.substring(fr.length - 3) !== '_fr'
}

export async function saveFiles() {
  await Promise.all(FILES.filter(f => f.disabled === false).map(saveFile))
}

export async function printHeaders() {
  await Promise.all(FILES.filter(f => f.disabled === false).map(printHeader))
}

export async function combineTxns() {
  const store = new Map<string, any>()
  await Promise.all(FILES.filter(f => f.disabled !== true).map(f => extractFileData(f).then((txns => txns.forEach(txn => store.set(`${txn.fileName}-${txn.propertyName}`, txn))))))

  const entries: Translation[] = Array.from(store.values()).map((v, i) => ({ ...v, key: i }))

  await Promise.all([
    writeFile(__dirname + '/../out/entries.json', JSON.stringify(entries), "utf8"),
    writeFile(__dirname + '/../out/translations.json', JSON.stringify(entries.filter(isGoodTranslation).map(e => ({ key: e.key, en: e.en, fr: e.fr }))), "utf8")
  ])
}



(async () => {
  // saveFiles
  // printHeaders
  // combineTxns
 await combineTxns()
})()