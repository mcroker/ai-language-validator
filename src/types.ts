export interface EntryBase {
  includeForAi?: boolean,
  fileName?: string,
  path?: string,
  propertyName?: string,
  component?: string,
  en?: string,
  fr?: string
}

 export interface GoodBase extends EntryBase {
  en: string,
  fr: string
}

 export function isGoodBase(t: any): t is GoodBase {
  return typeof t.en === 'string'
    && typeof t.fr === 'string'
    && t.en.length !== 0
    && t.fr.length !== 0
}

export interface Entry extends EntryBase {
  key: string
}

export function isEntry(x: any): x is Entry {
  return typeof x.key === 'string'
}

 interface AIResultBase extends EntryBase {
  aiTranslationScore: number
  aiConsistencyScore: number
  aiResultAvailable?: boolean
  aiSuggestion?: string
  entryFr?: string
  aiFr?: string
  entryEn?: string
  aiEn?: string
  mergeError?: string
}

export interface AIResult extends AIResultBase {
  key: string
}

export interface AIResponse extends AIResultBase {
  key: number
}

export interface GoodEntry extends Entry {
  en: string,
  fr: string
}

export function isGoodEntry(t: any): t is GoodEntry {
  return isGoodBase(t) && isEntry(t)
}

export function isTranslationCandidate(t: Entry): boolean {
  if (!isGoodBase(t)) return false
  const fr = t.fr.toLowerCase()
  const en = t.en.toLowerCase()
  return !(
    fr === 'undefined'
    || fr === 'data?'
    || RegExp(/_fr/).test(fr)
    || (en.length <= 3 && en === fr)
  )
}

export interface AITranslation {
  key: number,
  en: string,
  fr: string
}

export function isAITranslation(t: any): t is AITranslation {
  return typeof t.key === 'number' && isGoodBase(t)
}

export enum h {
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

export type MapperFn = (x: any) => Entry;

export interface FileDef {
  disabled?: boolean,
  srcFile: string,
  outFile: string,
  sheetName?: string,
  sheetRows?: number,
  mapper?: MapperFn,
  headers?: string[]
}