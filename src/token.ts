let memoryToken: string | null = null;

export function getSessionToken() {
  return memoryToken;
}

export function setMemoryToken(token: string | null) {
  memoryToken = token;
}
