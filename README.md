
# 🥑 Saludario API 🍏

**Saludario** is a web-based food diary application focused on health. This API allows users to log their meals, view daily entries, and potentially correlate future symptoms with past meals. Built with Node.js, Express, TypeScript and MongoDB, the Saludario API serves as the backend layer for the Saludario web application.

## 🍒 Features

- **User Management**: Register and log in to track personal meal data.
- **Food Entries**: Add, retrieve, and manage daily food entries.
- **Meal Categorization**: Classify entries by breakfast, lunch, dinner, or snack.
- **Health Focus**: Designed to help identify patterns between food intake and health symptoms.

## 🥦 Tech Stack

- **Language**: TypeScript  
- **Runtime**: Node.js  
- **Framework**: Express.js  
- **Database**: MongoDB & Mongoose (ODM)  
- **Authentication**: JWT-based (JSON Web Tokens)

## 🍇 Getting Started

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/your-username/saludario-api.git
   cd saludario-api
   ```
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Setup Environment Variables**: Create a .env file in the root directory:
    ```env
    MONGO_URI=mongodb://localhost:27017/saludario
    PORT=5000
    JWT_SECRET=your_jwt_secret
    ```
4. **Run the Server**:
   ```bash
    npm run build
    npm start
    ```
The API will be accessible at http://localhost:5000. 

## 🍉 API Endpoints
1. **Authentication**
   ```bash    
   POST /api/auth/register   # Register a new user.
   POST /api/auth/login      # Log in a user and receive a JWT.
   ```

2. **Food Entries**
    ```bash
    GET /api/food-entries         # Fetch user’s daily food entries.
    POST /api/food-entries        # Create a new food entry.
    GET /api/food-entries/:id     # Retrieve a specific food entry.
    PUT /api/food-entries/:id     # Update an existing food entry.
    DELETE /api/food-entries/:id  # Delete a food entry.
    ```

## 🏋️‍♂️ Contributing
1. Fork the repository and create a new branch for your feature/fix.
2. Make changes and ensure all tests pass.
3. Submit a pull request with a clear description of your changes.

 ## ❤️ License
This project is licensed under the MIT License.

## 🩺 Contact
For any inquiries or support, please open an issue on GitHub.
*Enjoy tracking your meals and improving your health with Saludario!*
