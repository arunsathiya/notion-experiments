import * as core from '@actions/core';
import { Client } from '@notionhq/client';
import dotenv from 'dotenv';
// Load environment variables from .env file when not in GitHub Actions
if (!process.env.GITHUB_ACTIONS) {
    dotenv.config();
}
export async function run() {
    try {
        const notionApiKey = process.env.GITHUB_ACTIONS
            ? core.getInput('notion_api_key')
            : process.env.NOTION_API_KEY;
        const notionDatabaseId = process.env.GITHUB_ACTIONS
            ? core.getInput('notion_database_id')
            : process.env.NOTION_DATABASE_ID;
        if (!notionApiKey || !notionDatabaseId) {
            throw new Error('Notion API key or Database ID is missing');
        }
        const notion = new Client({ auth: notionApiKey });
        await checkForNewPages(notion, notionDatabaseId);
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Error: ${errorMessage}`);
        if (process.env.GITHUB_ACTIONS) {
            core.setFailed(errorMessage);
        }
    }
}
async function checkForNewPages(notion, databaseId) {
    try {
        // First, retrieve the database schema
        const database = await notion.databases.retrieve({ database_id: databaseId });
        // Check if 'Icon' and 'Cover' properties exist
        const iconProperty = Object.values(database.properties).find(prop => prop.name === 'Icon');
        const coverProperty = Object.values(database.properties).find(prop => prop.name === 'Cover');
        if (!iconProperty || !coverProperty) {
            throw new Error(`Database is missing required properties. Found: ${Object.values(database.properties).map(p => p.name).join(', ')}`);
        }
        const response = await notion.databases.query({
            database_id: databaseId,
            filter: {
                and: [
                    {
                        property: iconProperty.name,
                        rich_text: {
                            is_empty: true
                        }
                    },
                    {
                        property: coverProperty.name,
                        files: {
                            is_empty: true
                        }
                    }
                ]
            }
        });
        console.log('Query response:', JSON.stringify(response, null, 2));
        for (const page of response.results) {
            await addIconAndCover(notion, page.id);
        }
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Error querying database: ${errorMessage}`);
        if (process.env.GITHUB_ACTIONS) {
            core.error(`Error querying database: ${errorMessage}`);
        }
    }
}
async function addIconAndCover(notion, pageId) {
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
        });
        const message = `Updated page ${pageId} with icon and cover`;
        console.log(message);
        if (process.env.GITHUB_ACTIONS) {
            core.info(message);
        }
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Error updating page ${pageId}: ${errorMessage}`);
        if (process.env.GITHUB_ACTIONS) {
            core.error(`Error updating page ${pageId}: ${errorMessage}`);
        }
    }
}
run();
//# sourceMappingURL=index.js.map