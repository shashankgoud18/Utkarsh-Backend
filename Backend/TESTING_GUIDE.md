# Postman Testing Guide - Complete Labour Registration System

## Prerequisites
- Server running: `npm run dev` (should be on `http://localhost:5000`)
- Postman installed
- MongoDB running with data (or fresh start)

---

## TEST CASE 1: Start Intake (Get All Questions)

### Endpoint
```
POST http://localhost:5000/api/labour/intake/start
```

### Headers
```
Content-Type: application/json
```

### Test Case 1.1: Hindi User (Mistri)
**Description:** User identifies as mistri in Hindi

**Request Body:**
```json
{
  "message": "main mesthri hun"
}
```

**Expected Response (200):**
```json
{
  "sessionId": "669f399fcfb78c350411e124",
  "language": "hindi",
  "allQuestions": [
    "आपका पूरा नाम क्या है?",
    "आपकी उम्र कितनी है?",
    "आपका फोन नंबर क्या है?",
    "आपको इस काम में कितने साल का अनुभव है?",
    "आपके मुख्य काम क्या हैं?",
    "आप कौन से उपकरण सबसे अधिक उपयोग करते हैं?",
    "काम करते समय सुरक्षा कैसे सुनिश्चित करते हैं?",
    "कोई आम समस्या को कैसे संभालते हैं?",
    "आप अपने काम की गुणवत्ता कैसे जांचते हैं?",
    "कोई कठिन काम का उदाहरण दें।"
  ],
  "basicQuestionsCount": 4
}
```

**Validation Checklist:**
- [ ] Status code is 200
- [ ] `sessionId` is returned (non-empty 24-char MongoDB ID)
- [ ] `language` detected as "hindi"
- [ ] `allQuestions` has exactly 10 items
- [ ] First 4 questions are basic demographic (name, age, phone, experience)
- [ ] Last 6 questions are Hindi trade-specific
- [ ] `basicQuestionsCount` is 4

**Save for Next Test:** Copy the `sessionId` value

---

### Test Case 1.2: English User (Carpenter)
**Description:** English-speaking user identifies as carpenter

**Request Body:**
```json
{
  "message": "I am a carpenter"
}
```

**Expected Response (200):**
```json
{
  "sessionId": "669f499fcfb78c350411e125",
  "language": "english",
  "allQuestions": [
    "What is your full name?",
    "How old are you?",
    "What is your phone number?",
    "How many years of experience do you have in this trade?",
    "What are the main tasks you do as a I am a carpenter?",
    "Which tools do you use most in I am a carpenter work?",
    "How do you ensure safety while working as a I am a carpenter?",
    "Explain how you handle a common problem in I am a carpenter work.",
    "How do you check quality in your work?",
    "Describe a difficult job you completed."
  ],
  "basicQuestionsCount": 4
}
```

**Validation Checklist:**
- [ ] Status code is 200
- [ ] `language` detected as "english"
- [ ] Questions are in English
- [ ] 10 questions total

---

### Test Case 1.3: Missing Message (Error Case)
**Description:** User doesn't provide message

**Request Body:**
```json
{
}
```

**Expected Response (400):**
```json
{
  "message": "Message is required"
}
```

**Validation Checklist:**
- [ ] Status code is 400 (Bad Request)
- [ ] Error message is clear

---

### Test Case 1.4: Different Languages
Test with these messages to verify language detection:

**Tamil User:**
```json
{
  "message": "நான் ஒரு மின்சாரம் தொழிலாளி"
}
```
Expected: `"language": "tamil"`

**Kannada User:**
```json
{
  "message": "ನಾನು ಒಬ್ಬ ಗಾರ್ಡನ್ ಸಾರಿ"
}
```
Expected: `"language": "kannada"`

**Telugu User:**
```json
{
  "message": "నేను ఒక పేంటర్"
}
```
Expected: `"language": "telugu"`

---

## TEST CASE 2: Submit Answers (Get Profile + Score)

### Endpoint
```
POST http://localhost:5000/api/labour/intake/:sessionId/answers
```

### Headers
```
Content-Type: application/json
```

### Test Case 2.1: Complete Valid Submission (10 Answers)
**Description:** User submits all 10 answers and gets evaluated profile

**Prerequisites:** 
- Have a `sessionId` from Test Case 1.1 or 1.2

**Request Body (replace sessionId):**
```json
{
  "sessionId": "669f399fcfb78c350411e124",
  "answers": [
    "Ramesh Kumar",
    "28",
    "9876543210",
    "7",
    "मैं ईंट, टाइल्स लगाता हूँ और सीमेंट मिलाता हूँ",
    "हथौड़ा, सीमेंट, ईंट, स्तर उपकरण",
    "सुरक्षा गियर पहनता हूँ, नीचे कोई न हो इसका ख्याल रखता हूँ",
    "अगर सीमेंट गलत मिक्स हो तो फिर से मिलाता हूँ",
    "माप लेता हूँ और सीधा और समान रखता हूँ",
    "5 मंजिला बिल्डिंग में 3 महीने काम किया"
  ]
}
```

**Expected Response (200):**
```json
{
  "completed": true,
  "profile": {
    "_id": "669f599fcfb78c350411e126",
    "name": "Ramesh Kumar",
    "phone": "9876543210",
    "age": 28,
    "trade": "mistri",
    "experience": 7,
    "location": "",
    "totalScore": 68,
    "badge": "Silver",
    "skillBreakdown": {
      "technical": 68,
      "safety": 68,
      "experience": 68,
      "problemSolving": 68,
      "communication": 68
    },
    "strengths": [
      "Mock data - answered questions"
    ],
    "weaknesses": [
      "Mock data - needs real evaluation"
    ],
    "recommendations": [
      "Get real API evaluation for detailed analysis"
    ],
    "workReadiness": "Intermediate",
    "confidenceLevel": "Medium",
    "hiringRecommendation": "Hire",
    "badge": "Silver"
  },
  "scoreOutOf100": 68
}
```

**Validation Checklist:**
- [ ] Status code is 200
- [ ] `completed` is true
- [ ] `profile._id` is returned (profile was created in DB)
- [ ] `profile.name` matches submitted answer
- [ ] `profile.phone` matches submitted answer
- [ ] `profile.age` is 28 (number, not string)
- [ ] `profile.experience` is 7
- [ ] `scoreOutOf100` is between 0-100
- [ ] `badge` is one of: Bronze, Silver, Gold
- [ ] `skillBreakdown` has all 5 skills (technical, safety, experience, problemSolving, communication)
- [ ] All scores in `skillBreakdown` are 0-100
- [ ] `workReadiness` is one of: Not Ready, Entry Level, Intermediate, Advanced, Expert
- [ ] `hiringRecommendation` is one of: Strong Hire, Hire, Maybe, No Hire
- [ ] `strengths` is an array with items
- [ ] `weaknesses` is an array with items
- [ ] `recommendations` is an array with items

---

### Test Case 2.2: Session Not Found (Error Case)
**Description:** Submit answers with invalid sessionId

**Request Body:**
```json
{
  "sessionId": "999999999999999999999999",
  "answers": ["Test", "25", "9999999999", "5", "work1", "work2", "work3", "work4", "work5", "work6"]
}
```

**Expected Response (404):**
```json
{
  "message": "Session not found"
}
```

**Validation Checklist:**
- [ ] Status code is 404
- [ ] Error message indicates session not found

---

### Test Case 2.3: Missing Answers (Error Case)
**Description:** Submit without answers array

**Request Body:**
```json
{
  "sessionId": "669f399fcfb78c350411e124"
}
```

**Expected Response (400):**
```json
{
  "message": "sessionId and answers array are required"
}
```

**Validation Checklist:**
- [ ] Status code is 400

---

### Test Case 2.4: Incomplete Answers (Less than 10)
**Description:** Submit only 5 answers instead of 10

**Request Body:**
```json
{
  "sessionId": "669f399fcfb78c350411e124",
  "answers": ["Raj", "25", "9999999999", "5", "work"]
}
```

**Expected Response:** Should still process but with missing work answers
**Validation:** Check that remaining answers are treated as empty strings

---

### Test Case 2.5: Extra Answers (More than 10)
**Description:** Submit 12 answers instead of 10

**Request Body:**
```json
{
  "sessionId": "669f399fcfb78c350411e124",
  "answers": [
    "Raj", "25", "9999999999", "5",
    "work1", "work2", "work3", "work4", "work5", "work6",
    "extra1", "extra2"
  ]
}
```

**Expected Response:** Should process first 10, ignore extra
**Validation:** Check that only first 10 are evaluated

---

## TEST CASE 3: Search Labour Profiles

### Endpoint
```
GET http://localhost:5000/api/labour/search
```

### Test Case 3.1: Search All (No Filters)
**Description:** Get all registered labour profiles

**URL:**
```
http://localhost:5000/api/labour/search
```

**Expected Response (200):**
```json
{
  "total": 2,
  "data": [
    {
      "_id": "669f599fcfb78c350411e126",
      "name": "Ramesh Kumar",
      "phone": "9876543210",
      "age": 28,
      "trade": "mistri",
      "experience": 7,
      "location": "",
      "totalScore": 68,
      "badge": "Silver",
      "hiringRecommendation": "Hire",
      "aiSummary": "..."
    },
    {
      "_id": "669f699fcfb78c350411e127",
      "name": "Another Worker",
      ...
    }
  ]
}
```

**Validation Checklist:**
- [ ] Status code is 200
- [ ] `total` shows count of profiles
- [ ] `data` is an array
- [ ] Each profile has: name, phone, age, trade, experience, totalScore, badge, hiringRecommendation

---

### Test Case 3.2: Filter by Trade
**Description:** Find all mistri (masons)

**URL:**
```
http://localhost:5000/api/labour/search?trade=mistri
```

**Expected Response:**
Only profiles with `trade: "mistri"`

**Validation:**
- [ ] All returned profiles have `trade: "mistri"`
- [ ] Can filter by: mistri, carpenter, plumber, electrician, etc.

---

### Test Case 3.3: Filter by Location
**Description:** Find workers in Bangalore

**URL:**
```
http://localhost:5000/api/labour/search?location=bangalore
```

**Expected Response:**
Only profiles with that location

---

### Test Case 3.4: Filter by Experience
**Description:** Find workers with +5 years experience

**URL:**
```
http://localhost:5000/api/labour/search?minExperience=5
```

**Expected Response:**
Only profiles with `experience >= 5`

---

### Test Case 3.5: Filter by Score Range
**Description:** Find highly qualified workers (score 70+)

**URL:**
```
http://localhost:5000/api/labour/search?minScore=70
```

**Expected Response:**
Only profiles with `totalScore >= 70`

---

### Test Case 3.6: Combined Filters
**Description:** Find experienced mistri in Bangalore with high score

**URL:**
```
http://localhost:5000/api/labour/search?trade=mistri&location=bangalore&minExperience=5&minScore=60
```

**Expected Response:**
Profiles matching ALL criteria

**Validation:**
- [ ] Returns only profiles matching trade=mistri
- [ ] All have location=bangalore
- [ ] All have experience >= 5
- [ ] All have score >= 60

---

### Test Case 3.7: Salary Range Filter
**Description:** Find workers asking for 300-500 per day

**URL:**
```
http://localhost:5000/api/labour/search?minSalary=300&maxSalary=500
```

**Expected Response:**
Only profiles with salary range overlapping 300-500

---

## TEST CASE 4: Get Labour Profile Details

### Endpoint
```
GET http://localhost:5000/api/labour/:id
```

### Test Case 4.1: Valid Profile ID
**Description:** Get complete profile with all details and evaluation breakdown

**URL (use ID from Test 2.1):**
```
http://localhost:5000/api/labour/669f599fcfb78c350411e126
```

**Expected Response (200):**
```json
{
  "_id": "669f599fcfb78c350411e126",
  "name": "Ramesh Kumar",
  "phone": "9876543210",
  "age": 28,
  "trade": "mistri",
  "experience": 7,
  "location": "",
  "skills": [],
  "languages": [],
  "totalScore": 68,
  "badge": "Silver",
  "skillBreakdown": {
    "technical": 68,
    "safety": 68,
    "experience": 68,
    "problemSolving": 68,
    "communication": 68
  },
  "strengths": [
    "Mock data - answered questions"
  ],
  "weaknesses": [
    "Mock data - needs real evaluation"
  ],
  "recommendations": [
    "Get real API evaluation for detailed analysis"
  ],
  "workReadiness": "Intermediate",
  "confidenceLevel": "Medium",
  "hiringRecommendation": "Hire",
  "aiSummary": "Mock evaluation summary...",
  "questions": [
    "What is your full name?",
    "How old are you?",
    ...
  ],
  "answers": [
    {
      "question": "What is your full name?",
      "answer": "Ramesh Kumar",
      "score": 10,
      "reason": "Basic information verified"
    },
    ...
  ]
}
```

**Validation Checklist:**
- [ ] Status code is 200
- [ ] All profile fields are present
- [ ] `answers` array shows both question and answer with score
- [ ] `skillBreakdown` has all 5 dimensions
- [ ] `questions` array matches what was asked
- [ ] All data types are correct (name is string, age is number, etc.)

---

### Test Case 4.2: Invalid Profile ID
**Description:** Request non-existent profile

**URL:**
```
http://localhost:5000/api/labour/999999999999999999999999
```

**Expected Response (404):**
```json
{
  "message": "Labour profile not found"
}
```

**Validation Checklist:**
- [ ] Status code is 404
- [ ] Error message is clear

---

### Test Case 4.3: Malformed ID
**Description:** Invalid MongoDB ID format

**URL:**
```
http://localhost:5000/api/labour/invalid-id
```

**Expected Response:** 400 or 500 error
**Validation:** Graceful error handling

---

## TEST CASE 5: Full End-to-End Flow

### Complete User Journey

**Step 1: User Registers as Mistri**
```
POST http://localhost:5000/api/labour/intake/start
{ "message": "main mesthri hun" }
```
✅ Save the `sessionId`

**Step 2: User Answers All 10 Questions**
```
POST http://localhost:5000/api/labour/intake/:sessionId/answers
{
  "sessionId": "...",
  "answers": [
    "Ramesh Kumar",
    "28",
    "9876543210",
    "7",
    "Brick laying and concrete work",
    "Hammer, level, trowel",
    "Always wear safety gear",
    "Redo the work carefully",
    "Check alignment and level",
    "Built 5-storey apartment complex"
  ]
}
```
✅ Save the profile `_id`

**Step 3: Contractor Searches for Mistri**
```
GET http://localhost:5000/api/labour/search?trade=mistri
```
✅ See Ramesh in results with score 68, Silver badge

**Step 4: Contractor Views Full Profile**
```
GET http://localhost:5000/api/labour/669f599fcfb78c350411e126
```
✅ See complete evaluation, skill breakdown, hiring recommendation

---

## TEST CASE 6: Data Validation

### Test Case 6.1: Phone Number Format
**Submit answer:** `"9876543210"` (10 digits)
**Validation:** Should be stored as string, not converted

### Test Case 6.2: Age Extraction
**Submit answer:** `"28"` or `"28 years"` or `"twenty eight"`
**Validation:** Should be parsed as number 28

### Test Case 6.3: Experience Parsing
**Submit answer:** `"7 years"` or `"7"` or `"seven"`
**Validation:** Should be parsed as number 7

### Test Case 6.4: Empty Answers
**Submit:** `""`
**Validation:** Should be accepted but affect score

### Test Case 6.5: Very Long Answer
**Submit:** 500+ character answer
**Validation:** Should be stored fully

---

## TEST CASE 7: Error Scenarios

| Scenario | Request | Expected Status | Expected Message |
|----------|---------|-----------------|-------------------|
| No request body | `{}` | 400 | "Message is required" |
| Null message | `{"message": null}` | 400 | "Message is required" |
| Empty message | `{"message": ""}` | 400 | "Message is required" |
| Invalid sessionId | `{"sessionId": "invalid", "answers": [...]}` | 404 | "Session not found" |
| Missing answers | `{"sessionId": "..."}` | 400 | "sessionId and answers array are required" |
| Non-array answers | `{"sessionId": "...", "answers": "test"}` | 400 | "sessionId and answers array are required" |
| Non-existent profile | `GET /:id` | 404 | "Labour profile not found" |
| Server error | Any request when DB is down | 500 | Error details |

---

## Quick Reference: API Response Codes

```
200 OK             - Request successful
400 Bad Request    - Missing/invalid parameters
404 Not Found      - Resource doesn't exist
500 Server Error   - Database or server issue
```

---

## Testing Checklist Summary

- [ ] Test 1.1: Hindi user gets Hindi questions
- [ ] Test 1.2: English user gets English questions
- [ ] Test 1.3: Missing message error
- [ ] Test 1.4: Multiple languages detected correctly
- [ ] Test 2.1: Valid submission creates profile with score
- [ ] Test 2.2: Invalid sessionId throws 404
- [ ] Test 2.3: Missing answers throws 400
- [ ] Test 2.4: Incomplete answers handled
- [ ] Test 2.5: Extra answers ignored
- [ ] Test 3.1: Search returns all profiles
- [ ] Test 3.2-3.7: Filters work correctly
- [ ] Test 4.1: Get profile shows all details
- [ ] Test 4.2: Invalid ID throws 404
- [ ] Test 5: End-to-end flow works
- [ ] Test 6: Data validation works
- [ ] Test 7: Error scenarios handled

---

## Tips for Testing

1. **Postman Collections:** Import these as Environment variables:
   - `base_url`: `http://localhost:5000`
   - `sessionId`: Leave blank, fill from Test 1 response

2. **Pre-request Script:** Use to save sessionId automatically:
   ```javascript
   if (pm.response.code === 200) {
     var jsonData = pm.response.json();
     if (jsonData.sessionId) {
       pm.environment.set("sessionId", jsonData.sessionId);
     }
   }
   ```

3. **Testing Order:** Always test 1 → 2 → 3 → 4 in sequence

4. **Mock vs Real API:** Current tests use mock evaluation (Gemini API failure). Once API is fixed, scores will be more accurate.

