from google import genai

client = genai.Client(api_key="AIzaSyDuzl7Q7BIbSG5knVepFTrODPP5E3MxxSc")

response = client.models.generate_content(
    model="gemini-2.5-flash", contents="Explain how AI works in a few words"
)

print(response.text)