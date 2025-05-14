import csv
import datetime
import random
import string
import sys
import time

import jinja2
import jwt
import numpy as np
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware
from starlette.requests import Request
from starlette.exceptions import HTTPException
from tensorflow.keras.models import load_model

from mail import send
from student import Student, Submission

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
        raise HTTPException(status_code=400,
                            detail=f"Invalid email: {email} or verification code: {verification_code} or one time token: {one_time_token}")


@app.get("/is_authenticated")
async def is_authenticated(request: Request):
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
    return students

model = load_model("mnist_tf_model.h5")


async def get_student(request: Request):
    try:
        encoded_jwt = jwt.decode(request.headers.get("Authorization"), APP_SECRET, algorithms=["HS256"])
    except:
        raise HTTPException(status_code=401, detail="Bạn chưa xác thực.")
    if "email" not in encoded_jwt:
        raise HTTPException(status_code=401, detail="Việc xác thực không hợp lệ.")

    email = encoded_jwt.get("email")
    student = None
    for s in students:
        if s.email == email:
            student = s
            break

    if student is None:
        raise HTTPException(status_code=401, detail="Email bạn dùng không tồn tại.")
    return student


async def get_submission(request: Request):
    body = await request.json()
    if "submission" not in body:
        raise HTTPException(status_code=400, detail="Phải đính kèm bài làm.")
    return body.get("submission")


async def get_prediction_confidence(submission):
    matrix = np.array(submission)
    result = model(np.array([matrix]).reshape(-1, 784))[0]
    result = np.array(result)
    prediction = int(np.argmax(result))
    confidence = float(result[prediction])
    return prediction, confidence

ALLOW_SUBMISSIONS = False


@app.post("/allow_submissions")
async def allow_submission(request: Request):
    student = await get_student(request)
    if student.group == '5':
        global ALLOW_SUBMISSIONS
        ALLOW_SUBMISSIONS = True
        return {
            "allowed": ALLOW_SUBMISSIONS
        }
    else:
        raise HTTPException(status_code=403, detail="Forbidden, not a member of group 5.")


@app.post("/disallow_submissions")
async def disallow_submission(request: Request):
    student = await get_student(request)
    if student.group == '5':
        global ALLOW_SUBMISSIONS
        ALLOW_SUBMISSIONS = False
        return {
            "allowed": ALLOW_SUBMISSIONS
        }
    else:
        raise HTTPException(status_code=403, detail="Forbidden, not a member of group 5.")


@app.post("/test_submission")
async def test_submission(request: Request):
    student = await get_student(request)
    submission = await get_submission(request)
    prediction, confidence = await get_prediction_confidence(submission)
    student.submissions.append(Submission(
        timestamp_milliseconds=datetime.datetime.now().microsecond / 1000,
        submission=submission,
        prediction=prediction,
        confidence=confidence))
    return {
        "prediction": prediction,
        "confidence": confidence,
    }


@app.get("/is_submission_allowed")
async def is_submission_allowed():
    global ALLOW_SUBMISSIONS
    return {
        "allowed": ALLOW_SUBMISSIONS
    }


@app.get("/begin_challenge")
async def begin_challenge(request: Request):
    global ALLOW_SUBMISSIONS
    if not ALLOW_SUBMISSIONS:
        raise HTTPException(status_code=403, detail="Forbidden, submissions are not allowed.")
    student = await get_student(request)
    if student.begin_challenge_timestamp_milliseconds is not None:
        raise HTTPException(status_code=403, detail=f"Forbidden, your challenge has begun at {student.begin_challenge_timestamp_milliseconds}.")

    student.begin_challenge_timestamp_milliseconds = time.time_ns() / 1000
    return {
        "ok": True
    }


@app.post("/submit")
async def submit(request: Request):
    global ALLOW_SUBMISSIONS
    if not ALLOW_SUBMISSIONS:
        raise HTTPException(status_code=403, detail="Forbidden, submissions are not allowed.")
    student = await get_student(request)
    if student.begin_challenge_timestamp_milliseconds is None:
        raise HTTPException(status_code=403, detail="Forbidden, you have not started a challenge yet.")
    submission = await get_submission(request)
    prediction, confidence = await get_prediction_confidence(submission)
    submission_time = time.time_ns() / 1000
    student.submissions.append(Submission(
        timestamp_milliseconds=submission_time,
        submission=submission,
        prediction=prediction,
        confidence=confidence,
    ))
    return {
        "time_span": submission_time - student.begin_challenge_timestamp_milliseconds,
        "prediction": prediction,
        "confidence": confidence,
    }


@app.get("/get_submissions")
async def grade(request: Request):
    student = await get_student(request)
    if student.group != '5':
        raise HTTPException(status_code=403, detail="Forbidden, not a member of group 5.")

    return {
        "submissions": list(map(lambda s: {
            "email": s.email,
            "submission": s.submissions[-1]
        }, filter(lambda s: len(s.submissions) > 0, students)))
    }


@app.post("/evaluate_submissions")
async def evaluate_submissions(request: Request):
    student = await get_student(request)
    if student.group != '5':
        raise HTTPException(status_code=403, detail="Forbidden, not a member of group 5.")

    body = await request.json()
    if "evaluations" not in body:
        raise HTTPException(status_code=400, detail="Missing evaluations")

    evaluations = body.get("evaluations")
    for evaluation in evaluations:
        if "email" not in evaluation:
            raise HTTPException(status_code=400, detail="Missing email")
        if "evaluated" not in evaluation:
            raise HTTPException(status_code=400, detail="Missing evaluated")
        if "ground_truth" not in evaluation:
            raise HTTPException(status_code=400, detail="Missing ground truth")
        email = evaluation.get("email")
        evaluated = evaluation.get("evaluated")
        ground_truth = evaluation.get("ground_truth")
        for s in students:
            if s.email == email:
                s.evaluated = evaluated
                s.ground_truth = ground_truth
                break


def get_student_score(student: Student):
    if not student.evaluated:
        # Student's submission has not been graded
        return 0

    if student.ground_truth:
        # AI guessed correctly
        return 0

    if len(student.submissions) == 0:
        # Student has not submitted anything
        return 0

    # Only take the last one
    submission = student.submissions[-1]

    # The more confidently wrong AI is, the better.
    # The less time it takes, the better
    return submission.confidence / (submission.timestamp_milliseconds - student.begin_challenge_timestamp_milliseconds)


@app.get("/ranking")
async def get_ranking(request: Request):
    scores = list(map(lambda s: get_student_score(s), students))
    max_score = max(scores)
    if max_score == 0:
        scaled_scores = scores
    else:
        scaled_scores = list(map(lambda score: 10.0 * score / max_score, scores))
    students_with_scores = list(zip(students, scores, scaled_scores))
    return {
        "ranking": sorted(list(map(lambda s: {
            "name": s[0].first_name,
            "email": s[0].email,
            "group": s[0].group,
            "score": s[1],
            "scaled_score": s[2]
        }, students_with_scores)), key=lambda rank: rank["score"], reverse=True)
    }


@app.post("/clear_all_submissions")
async def clear_all_submissions(request: Request):
    student = await get_student(request)
    if student.group != '5':
        raise HTTPException(status_code=403, detail="Forbidden, not a member of group 5.")
    for s in students:
        s.submissions = []
    return {
        "ok": True
    }


@app.post("/clear_submissions")
async def clear_submission(request: Request):
    student = await get_student(request)
    if student.group != '5':
        raise HTTPException(status_code=403, detail="Forbidden, not a member of group 5.")

    body = await request.json()
    if "email" not in body:
        raise HTTPException(status_code=400, detail="Missing email")
    email = body.get("email")
    for s in students:
        if s.email == email:
            s.submissions = []
            return {
                "email": email
            }