# Nano Banana Image Generation Skill

Use this skill when the user asks you to generate, create, or make an image using AI.

## When to Use This Skill
- User explicitly requests image generation ("generate an image of...", "create a picture of...", "make an image showing...")
- User asks for custom graphics or artwork that doesn't exist
- User needs placeholder images with specific content

## How Nano Banana Works in Vibecode

Nano Banana is Vibecode's image generation API. To use it:

1. **Check for API Configuration**
   - First, check if the user has configured Nano Banana in their environment
   - Look for `NANOBANANA_API_KEY` in the .env file
   - If not configured, direct the user to the API tab in Vibecode to set up Nano Banana

2. **API Endpoint**
   ```
   POST https://api.nanobanana.ai/v1/images/generations
   ```

3. **Request Format**
   ```typescript
   {
     "model": "flux-1.1-pro-ultra",  // or "flux-1.1-pro"
     "prompt": "detailed description of the image",
     "width": 1024,   // optional, default varies by model
     "height": 1024,  // optional, default varies by model
     "num_inference_steps": 30,  // optional, quality/speed tradeoff
     "guidance_scale": 3.5,      // optional, prompt adherence
     "seed": 42                   // optional, for reproducibility
   }
   ```

4. **Headers**
   ```typescript
   {
     "Authorization": `Bearer ${NANOBANANA_API_KEY}`,
     "Content-Type": "application/json"
   }
   ```

5. **Response Format**
   ```typescript
   {
     "data": [
       {
         "url": "https://...",  // Direct image URL
         "b64_json": "..."      // Base64 encoded image (if requested)
       }
     ]
   }
   ```

## Implementation Steps

When the user asks for an image:

1. **Read .env file** to check if `NANOBANANA_API_KEY` exists
   - If missing, tell user: "To generate images, please go to the API tab in Vibecode and set up Nano Banana"

2. **Create image generation utility** (if it doesn't exist)
   - Location: `src/lib/nanobanana.ts`
   - Export a function that handles the API call
   - Include proper error handling

3. **Generate the image**
   - Make POST request to Nano Banana API
   - Use descriptive prompts for better results
   - Default to `flux-1.1-pro` model (faster, cheaper) unless user needs ultra quality

4. **Save to public folder**
   - Create `/home/user/workspace/public/images/` folder if it doesn't exist
   - Fetch the image from the returned URL
   - Save with a descriptive filename (e.g., `sunset-beach-scene.png`)
   - Return the path to the user

5. **Provide usage instructions**
   - Tell user the image is saved and where
   - Show how to use it in their app: `require('../../public/images/filename.png')`
   - Or reference by URI: `{ uri: 'file:///path/to/image.png' }`

## Example Implementation

```typescript
// src/lib/nanobanana.ts
const NANOBANANA_API_KEY = process.env.EXPO_PUBLIC_NANOBANANA_API_KEY;

export async function generateImage(prompt: string, options?: {
  model?: 'flux-1.1-pro' | 'flux-1.1-pro-ultra';
  width?: number;
  height?: number;
  seed?: number;
}) {
  if (!NANOBANANA_API_KEY) {
    throw new Error('Nano Banana API key not configured');
  }

  const response = await fetch('https://api.nanobanana.ai/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${NANOBANANA_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: options?.model || 'flux-1.1-pro',
      prompt,
      width: options?.width,
      height: options?.height,
      seed: options?.seed,
    }),
  });

  if (!response.ok) {
    throw new Error(`Nano Banana API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data[0].url;
}
```

## Important Notes

- Nano Banana is a paid API - be mindful of costs
- `flux-1.1-pro` is faster and cheaper, good for most use cases
- `flux-1.1-pro-ultra` is higher quality but more expensive
- Images are generated at 1024x1024 by default
- The API returns a URL - you need to download and save it
- Always handle errors gracefully and inform the user

## When NOT to Use This Skill

- User just needs generic stock photos → Use Unsplash URLs instead
- User wants to upload their own image → Direct them to IMAGES tab
- User hasn't set up Nano Banana yet → Direct them to API tab first
