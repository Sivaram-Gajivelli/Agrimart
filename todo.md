Create a full-featured AI chatbot for the Agrimart website that works in both Customer and Farmer portals.

### 1. Chatbot UI & Placement

* Place chatbot at the bottom-right corner on all pages except the checkout page.
* Use the chatbot image from the images folder as the icon.
* Chat window should open/close on click.
* Maintain modern UI with message bubbles and timestamps.

### 2. Core Functionalities

The chatbot should:

* Answer queries related to:

  * Products (search, availability, pricing)
  * Orders (placement, cancellation, tracking)
  * Payments and fees
  * Farmer registration and product listing
* Help users navigate the website
* Handle complaints and general website issues

### 3. Order Tracking

* Fetch real-time order status from the database
* Respond with current order stage (Processing / Shipped / Delivered)

### 4. Context Awareness

* Maintain conversation context
* Example: If user asks “Where is my order?” → follow-up “When will it arrive?” should use same order

### 5. Multilingual + Voice Support

* Accept voice and text input
* Support multiple languages (English, Telugu, Hindi, Tamil)
* Respond in the same language as the user
* Use speech-to-text and text-to-speech

### 6. AI Integration

* Use Gemini API for natural language understanding
* Restrict chatbot to Agrimart-related queries only

### 7. Product Pricing

* Fetch live product prices
* Predict next 7 days price trend
* The live prices fetching and price prediction is similar to the live prices and price predictions in farmer portal.
* For the farmer side when he asks for price prediction tell the farmer on which day it will be better sell prices based on the next 7 days price prediction.

### 8. Fallback Handling

* If query is beyond the chatbot scope:

  * Show customer support contact details
  * Suggest contacting support

### 9. Contact Us Page

Create a “Contact Us” page with:

* Name, Email, Message fields
* Submit button
* Store queries in database
* Display customer support details (email, phone)

### 10. Complaint Handling System

* Allow users (both customers and farmers) to submit complaints directly through the chatbot and Contact Us page

* Complaint types:

  * Order issues (delay, wrong product, cancellation)
  * Payment issues
  * Product quality issues
  * Farmer listing issues
  * General website issues

* Chatbot should detect complaint intent and guide the user to submit details

* Collect complaint details:

  * User ID
  * Order ID (if applicable)
  * Issue description
  * Category

* Provide acknowledgment message with complaint ID through email notification or mobile message

* Allow users to check complaint status via chatbot or contact us page

* Provide escalation option to contact customer support if issue is critical

* Link the Contact us page in the footer.
