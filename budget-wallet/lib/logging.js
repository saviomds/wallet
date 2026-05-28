export function logInfo(tag, message, meta) {
  try {
    const out = { tag, message, meta };
    console.log(JSON.stringify(out));
  } catch (e) {
    console.log(tag, message, meta || '');
  }
}

export function logError(tag, message, meta) {
  try {
    const out = { tag, message, meta };
    console.error(JSON.stringify(out));
  } catch (e) {
    console.error(tag, message, meta || '');
  }
}
