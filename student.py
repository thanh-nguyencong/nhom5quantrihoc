import csv

from bs4 import BeautifulSoup


class Student:
    """<span>STT</span>
<span>Mã sinh viên</span>
<span>Họ</span>
<span>Tên</span>
<span>Ngày sinh</span>
<span>Nơi sinh</span>
<span>Mã lớp</span>
<span>Email</span>
<span>Nhóm</span>"""

    def __init__(self, student_id, name, first_name, date_of_birth, place_of_birth, class_id, email, group):
        self.student_id = student_id
        self.name = name
        self.first_name = first_name
        self.date_of_birth = date_of_birth
        self.place_of_birth = place_of_birth
        self.class_id = class_id
        self.email = email
        self.group = group

    # iter
    def __iter__(self):
        yield self.student_id
        yield self.name
        yield self.first_name
        yield self.date_of_birth
        yield self.place_of_birth
        yield self.class_id
        yield self.email
        yield self.group

    def __repr__(self):
        return f"{self.student_id} {self.name} {self.first_name} {self.date_of_birth} {self.place_of_birth} {self.class_id} {self.email} {self.group}"

if __name__ == "__main__":
    with (open("class.html", "r") as f):
        soup = BeautifulSoup(f.read(), "html.parser")
        children = []
        for child in soup.children:
            if child == '\n':
                continue
            children.append(child.contents[0])

        student_count = len(children) / 9
        students = []
        for i in range(1, int(student_count)):
            students.append(Student(children[i * 9 + 1], children[i * 9 + 2] + " " + children[i * 9 + 3], children[i * 9 + 3],
                                    children[i * 9 + 4], children[i * 9 + 5], children[i * 9 + 6],
                                    children[i * 9 + 7], children[i * 9 + 8]))

        # save to csv
        with open("class.csv", "w") as f2:
            writer = csv.writer(f2)
            writer.writerows(students)
