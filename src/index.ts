import * as core from '@actions/core'
import { Client } from '@notionhq/client'

async function run(): Promise<void> {
  try {
    const notionApiKey: string = core.getInput('notion_api_key')
    const notionDatabaseId: string = core.getInput('notion_database_id')

    const notion = new Client({ auth: notionApiKey })

    await checkForNewPages(notion, notionDatabaseId)

  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

async function checkForNewPages(notion: Client, databaseId: string): Promise<void> {
  try {
    const response = await notion.databases.query({
      database_id: databaseId,
      filter: {
        and: [
          {
            property: "Icon",
            rich_text: {
              is_empty: true
            }
          },
          {
            property: "Cover",
            files: {
              is_empty: true
            }
          }
        ]
      }
    })

    for (const page of response.results) {
      await addIconAndCover(notion, page.id)
    }
  } catch (error) {
    core.error(`Error querying database: ${error instanceof Error ? error.message : String(error)}`)
  }
}

async function addIconAndCover(notion: Client, pageId: string): Promise<void> {
  try {
    await notion.pages.update({
      page_id: pageId,
      icon: {
        type: "emoji",
        emoji: "🚀"
      },
      cover: {
        type: "external",
        external: {
          url: "https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9"
        }
      }
    })
    core.info(`Updated page ${pageId} with icon and cover`)
  } catch (error) {
    core.error(`Error updating page ${pageId}: ${error instanceof Error ? error.message : String(error)}`)
  }
}

run()