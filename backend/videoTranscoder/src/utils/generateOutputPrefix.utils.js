export function generateOutputPrefix(s3Key) {
  // Remove private/ from the input key
  const keyWithoutPrivate = s3Key.replace('private/', '');
  
  // Find the index of the last '/' and slice everything before that 
  const outputPrefix = keyWithoutPrivate.substring(0, keyWithoutPrivate.lastIndexOf('/'));

  return outputPrefix;
}
