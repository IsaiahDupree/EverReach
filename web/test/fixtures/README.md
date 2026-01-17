# Test Fixtures

This directory contains test files and mock data used in E2E tests.

## Audio Files

For voice note upload tests, place sample audio files here:

- `sample-audio.m4a` - Sample voice note for upload testing (create this file)
- `sample-audio.mp3` - Alternative format
- `sample-audio.wav` - WAV format

You can create these files using:
- Recording a quick voice memo on your phone
- Using online audio generators
- Using `ffmpeg` to create test audio:
  ```bash
  ffmpeg -f lavfi -i sine=frequency=1000:duration=5 -ac 1 sample-audio.m4a
  ```

## Images

For screenshot/image upload tests:

- `sample-image.png` - Test image file
- `sample-screenshot.jpg` - Screenshot test file

## JSON Data

Mock API responses can be stored here for reference:

- `mock-contacts.json`
- `mock-alerts.json`
- `mock-interactions.json`

## Usage in Tests

```typescript
import * as path from 'path'

const testFilePath = path.join(__dirname, '../test/fixtures/sample-audio.m4a')
await fileInput.setInputFiles(testFilePath)
```

## Notes

- These files are used for testing only
- Do not commit large files (keep under 1MB if possible)
- Use `.gitignore` to exclude actual audio/video files if they're large
