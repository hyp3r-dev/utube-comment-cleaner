# Demo Data for Testing

This directory contains sample Google Takeout comment export files that can be used for testing the CommentSlash application.

## Files

### `Kommentare-example.csv`
A German-language Google Takeout CSV export with 30 sample YouTube comments. This format mirrors the actual structure of Google Takeout exports, including:

- Multi-line JSON text fields
- Various comment lengths and types
- German headers (Kommentar-ID, Video-ID, etc.)
- ISO 8601 timestamps
- Comments on different videos

## How to Use

### For Manual Testing
1. Start the development server with `npm run dev`
2. Navigate to the application at http://localhost:5173
3. Click "Select File(s)" in the import section
4. Choose `Kommentare-example.csv` from this directory
5. The application will parse and display the comments

### For Automated Testing
These files can be used in integration tests to verify:
- CSV parsing functionality
- Multi-language header support
- JSON text field parsing
- Comment display and filtering

## Google Takeout CSV Format

The CSV format used by Google Takeout for YouTube comments includes:

**Headers (German example):**
- `Kommentar-ID` - The YouTube comment ID
- `Kanal-ID` - Your YouTube channel ID
- `Zeitstempel der Erstellung des Kommentars` - Creation timestamp
- `Preis` - Price (for Super Chat, usually 0)
- `Übergeordnete Kommentar-ID` - Parent comment ID (for replies)
- `Beitrags-ID` - Post ID (for community posts)
- `Video-ID` - The YouTube video ID
- `Kommentartext` - Comment text in JSON format
- `Kommentar-ID der obersten Ebene` - Top-level comment ID

**Comment Text Format:**
The comment text is stored as JSON objects, either:
- Single: `{"text":"Comment content"}`
- Multi-line: `{"text":"Line 1"},{"text":"\n"},{"text":"Line 2"}`

## Notes for AI Agents

When working on features related to:
- File import/parsing
- Comment display
- Filter functionality
- Date handling

Use these demo files to test your changes without needing access to real Google Takeout exports.
