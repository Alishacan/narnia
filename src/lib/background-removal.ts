export async function removeBg(imageFile: File): Promise<Blob> {
  const formData = new FormData();
  formData.append('image', imageFile);

  const response = await fetch('/api/ai/remove-bg', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    // Fallback: return the original image if background removal fails
    return imageFile;
  }

  return response.blob();
}
