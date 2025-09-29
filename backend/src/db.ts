import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'

// Define the structure of our data
type PolicyData = {
  resourceCid: string;
  faceCid: string;
  secretKey: string;
}

type DataSchema = {
  policies: Record<string, PolicyData>;
}

// Configure the database
const defaultData: DataSchema = { policies: {} }
const adapter = new JSONFile<DataSchema>('db.json')
const db = new Low(adapter, defaultData)

// Read data from disk
await db.read()

export default db
