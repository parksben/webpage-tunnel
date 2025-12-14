// Mock nanoid for Jest tests
let counter = 0;

export const nanoid = (): string => {
  return `mock_${Date.now()}_${counter++}`;
};
