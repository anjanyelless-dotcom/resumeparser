/**
 * Service for calling AI service endpoints
 */

const AI_SERVICE_URL = process.env.AI_SERVICE_URL;

export const callAIService = async (
  endpoint: string,
  data: any,
): Promise<any> => {
  try {
    const response = await fetch(`${AI_SERVICE_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI service returned ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error(`Error calling AI service ${endpoint}:`, error);
    throw error;
  }
};
