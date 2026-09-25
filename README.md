\# Signal Clone



A real-time messaging application inspired by Signal, built with a Next.js frontend and FastAPI backend.



\## Features



\* User registration and login

\* Direct conversations

\* Real-time messaging using WebSockets

\* Message persistence

\* Message delivery/read status

\* Typing indicator

\* Online/offline presence

\* Unread message count

\* Group creation

\* Group member management

\* Add and remove group members

\* Group admin controls



\## Tech Stack



\### Frontend



\* Next.js

\* React

\* TypeScript

\* Tailwind CSS



\### Backend



\* FastAPI

\* Python

\* SQLAlchemy

\* WebSockets



\### Database



\* SQL database using SQLAlchemy



\## Project Structure



```text

signal-clone/

├── frontend/

└── backend/

```



\## Running Locally



\### Backend



```bash

cd backend

```



Create and activate a virtual environment:



```bash

python -m venv venv

```



Windows:



```bash

venv\\Scripts\\activate

```



Install dependencies:



```bash

pip install -r requirements.txt

```



Start the FastAPI server:



```bash

uvicorn app.main:app --reload

```



\### Frontend



Open another terminal:



```bash

cd frontend

npm install

npm run dev

```



The frontend will run on the local Next.js development server.



\## Environment Variables



Create the required `.env` files locally and configure the database and other environment-specific values required by the application.



Do not commit `.env` files or credentials to GitHub.



\## Real-Time Communication



The application uses WebSockets for real-time communication, including:



\* New messages

\* Message status updates

\* Typing indicators

\* Online/offline presence



\## Repository



GitHub:



https://github.com/AyushSharma67/signal-clone



## Deployment

### Live Application

https://signal-clone-beta-five.vercel.app

### Backend API

https://signal-clone-i487.onrender.com

## Repository

https://github.com/AyushSharma67/signal-clone




\## Evaluation



The application was tested for:



\* Authentication

\* Direct messaging

\* Real-time message delivery

\* Message status updates

\* Typing indicators

\* Online/offline presence

\* Unread messages

\* Group creation

\* Group member management

\* Data persistence



