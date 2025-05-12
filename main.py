import asyncio
import csv
import datetime
import random
import string
import sys

import jinja2
import jwt
import numpy as np
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware
from starlette.requests import Request
from starlette.exceptions import HTTPException
from tensorflow.keras.models import load_model

from mail import send
from student import Student


app = FastAPI()

students = []
with open("class.csv") as class_file:
    for line in csv.reader(class_file):
        students.append(Student(*line))

app_url = None
# dev will be dev, prod will be run
is_prod = sys.argv[1] == "run"
print(f"Is production: {is_prod}")
with open(".env") as env_file:
    for line in env_file:
        if is_prod and line.startswith("PRD_APP_URL="):
            app_url = line.split("=")[1].strip()
            break
        elif not is_prod and line.startswith("DEV_APP_URL="):
            app_url = line.split("=")[1].strip()
            break
print(f"App url: {app_url}")

ui_url = None
with open(".env") as env_file:
    for line in env_file:
        if is_prod and line.startswith("PRD_UI_URL="):
            ui_url = line.split("=")[1].strip()
            break
        elif not is_prod and line.startswith("DEV_UI_URL="):
            ui_url = line.split("=")[1].strip()
            break
print(f"UI url: {ui_url}")

origins = [
    ui_url,
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
jinja_env = jinja2.Environment(loader=jinja2.FileSystemLoader("jinja_templates"))

APP_SECRET = f"the-secret-of-thanh-no-need-for-good-cryptographic-strength-because-it-is-just-a-game"


@app.post("/request_email_verification")
async def request_email_verification(request: Request):
    body = await request.json()
    if "email" not in body or body.get("email") is None or body.get("email") == "":
        raise HTTPException(status_code=400, detail="Missing email")

    body_email = body.get("email")
    students_with_mail = list(filter(lambda s: s.email == body_email, students))
    if len(students_with_mail) != 1:
        raise HTTPException(status_code=400, detail=f"Invalid email {body_email}")

    student = students_with_mail[0]

    email_template = jinja_env.get_template("verification_email_template.html.jinja")
    numbers = [random.randint(10, 99), random.randint(10, 99), random.randint(10, 99)]
    verification_code = numbers[random.randint(0, 2)]
    one_time_token = "".join(random.choice(string.ascii_letters + string.digits) for _ in range(100))
    await save_email_challenge(
        student.email,
        one_time_token,
        verification_code
    )
    print(f"Sending email to {student.email} with verification code {verification_code} with origin {ui_url}")
    send(body_email, "Xác thực email cho trò chơi Đánh lừa AI, nhóm 5 Quản trị học", email_template.render(
        first_name=student.first_name,
        verification_link_1=f"{ui_url}/verify_email?email={student.email}&name={student.first_name}&verification_code={numbers[0]}&one_time_token={one_time_token}",
        verification_link_2=f"{ui_url}/verify_email?email={student.email}&name={student.first_name}&verification_code={numbers[1]}&one_time_token={one_time_token}",
        verification_link_3=f"{ui_url}/verify_email?email={student.email}&name={student.first_name}&verification_code={numbers[2]}&one_time_token={one_time_token}",
        number_1=numbers[0],
        number_2=numbers[1],
        number_3=numbers[2]
    ))
    return {
        "verification_code": verification_code
    }


EMAIL_CHALLENGES = set()


async def save_email_challenge(email, one_time_token, correct_answer):
    EMAIL_CHALLENGES.add(f"{email},{correct_answer},{one_time_token}")


@app.post("/verify_email")
async def verify_email(request: Request):
    body = await request.json()
    if "email" not in body:
        raise HTTPException(status_code=400, detail="Missing email")
    if "verification_code" not in body:
        raise HTTPException(status_code=400, detail="Missing verification code")
    if "one_time_token" not in body:
        raise HTTPException(status_code=400, detail="Missing one time token")
    email = body.get("email")
    verification_code = body.get("verification_code")
    one_time_token = body.get("one_time_token")
    student = None
    for s in students:
        if s.email == email:
            student = s
            break
    if f"{email},{verification_code},{one_time_token}" in EMAIL_CHALLENGES:
        encoded_jwt = jwt.encode({
            "email": email,
            "name": student.first_name,
            "group": student.group
        }, APP_SECRET, algorithm="HS256")
        return {
            "jwt": encoded_jwt,
            "name": student.first_name,
            "email": email,
            "group": student.group,
        }
    else:
        raise HTTPException(status_code=400, detail=f"Invalid email: {email} or verification code: {verification_code} or one time token: {one_time_token}")


@app.get("/is_authenticated")
async def is_authenticated(request: Request):
    encoded_jwt = None
    try:
        encoded_jwt = jwt.decode(request.headers.get("Authorization"), APP_SECRET, algorithms=["HS256"])
    except:
        return {
            "is_authenticated": False
        }
    if "email" not in encoded_jwt:
        return {
            "is_authenticated": False
        }

    email = encoded_jwt.get("email")
    student = None
    for s in students:
        if s.email == email:
            student = s
            break

    if student is None:
        return {
            "is_authenticated": False
        }

    return {
        "is_authenticated": True
    }


@app.get("/students")
async def get_students():
    await asyncio.sleep(1)
    return students

model = load_model("mnist_tf_model.h5")


@app.post("/test_submission")
async def test_submission(request: Request):
    body = await request.json()
    if "submission" not in body:
        raise HTTPException(status_code=400, detail="Missing submission")
    submission = body.get("submission")
    matrix = np.array(submission)
    result = model(np.array([matrix]).reshape(-1, 784))[0]
    result = np.array(result)
    prediction = int(np.argmax(result))
    confidence = float(result[prediction])
    return {
        "prediction": prediction,
        "confidence": confidence,
    }


@app.post("/submit")
async def submit(request: Request):
    body = await request.json()
    if "submission" not in body:
        raise HTTPException(status_code=400, detail="Missing submission")
    submission = body.get("submission")
    matrix = np.array(submission)
    result = model(np.array([matrix]).reshape(-1, 784))[0]
    result = np.array(result)
    prediction = int(np.argmax(result))
    confidence = float(result[prediction])
    return {
        "prediction": prediction,
        "confidence": confidence,
    }
