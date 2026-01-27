# TalentOps Performance Review & Ranking System Documentation

## Overview
The TalentOps platform features a multi-tiered performance evaluation system designed to track student progress, provide tutor feedback, and maintain cohort-wide accountability through a dynamic ranking system.

---

## 1. Task Reviews
Task reviews are per-assignment evaluations where tutors or mentors grade specific deliverables.

### **A. Tutor & Mentor Dashboard (`TaskReviewPage.tsx`)**
*   **Functionality**: Tutors and Mentors can view all tasks assigned to students.
*   **Workflow**:
    1. Select a student and a specific task.
    2. Assign a score (Scale 1-10) and provide detailed qualitative feedback.
    3. Hierarchy: Executives can override reviews provided by Mentors/Tutors to maintain consistency.
*   **Real-time Updates**: Updates are reflected instantly via Supabase Realtime subscriptions.

### **B. Student Dashboard (`MyReviewPage.tsx`)**
*   **Section**: "My Reviews" -> "Score" Tab.
*   **Functionality**: Students see a timeline of their tasks and the corresponding feedback.
*   **Key Features**:
    *   **Visibility Logic**: Tasks remain visible in the timeline if:
        1. The due date falls within the selected week.
        2. A review was updated/created for that task within the selected week.
    *   **Timezone Normalization**: Dates are normalized to "Local Noon" to prevent timezone shifts (e.g., reviews given in the morning appearing on the previous day).
    *   **Visual Feedback**: Distinct badges for "Completed", "Reviewed", or "Pending".

---

## 2. Student Reviews (Skills Assessments)
Periodic evaluations (Weekly/Monthly) focused on holistic behavioral and technical growth.

### **A. Tutor & Mentor Dashboard (`StudentReviewPage.tsx`)**
*   **Functionality**: Used for deep-dive assessments on a recurring basis.
*   **Assessment Areas**:
    *   **Soft Skills**: 10 traits (Communication, Leadership, Integrity, etc.).
    *   **Development Skills**: 9 traits (JavaScript, React, Database, Tooling, etc.).
*   **Scoring**: Averaged to provide a "Soft Skill Score" and a "Dev Skill Score".

### **B. Ranking System Impact**: These assessments are the primary data source for the organization's Rankings.

---

## 3. Organization Rankings (Leaderboard)
A competitive yet supportive module that identifies top performers and flags students requiring intervention.

### **Ranking Logic (`rankingService.ts`)**
*   **Source Data**: Aggregates all scores from `student_skills_assessments`.
*   **Exclusion Logic**: Only students who have received at least one assessment are ranked. Students with a score of 0 are filtered out.
*   **Calculation**: `Overall Score = (Soft Skill Avg + Dev Skill Avg) / 2`.

### **Dashboard Implementations (`LeaderboardPage.tsx`)**

#### **Executive & Manager/Tutor View**
*   **Full Leaderboard**: Displays the top 5 students.
*   **Intervention Required**: Displays the "Bottom 5" list (Risk Groups) with full names and scores.
*   **Red Zone/Yellow Zone**: Clearly categorizes at-risk students for proactive management.

#### **Student View**
*   **Top 5 Performers**: Visible to all to inspire healthy competition.
*   **Privacy-First Risk Alerts**:
    *   Students **cannot** see the "Bottom 5" list of their peers.
    *   If a student falls into a risk zone, they see a personalized, high-priority alert card immediately below the Top 5.
    *   **Zones defined**:
        *   **Red Zone (Positions N to N-3 from bottom)**: Triggered for the bottom 4 performing students.
        *   **Yellow Zone (Position N-4 from bottom)**: Triggered for the 5th person from the bottom.
    *   **Message**: "⚠️ Improve your skills or work hard!"

---

## 4. Technical Specifications

### **Database Tables (Supabase)**
1.  **`student_task_reviews`**: Stores per-task scores and feedback.
    *   *Constraint*: Unique per `student_id` and `task_id` (enforces one review per task).
2.  **`student_skills_assessments`**: Stores periodic Soft/Dev scores.
    *   *RLS Policy*: Authenticated users can see assessments within their own organization.

### **Real-time Synchronization**
The application uses Supabase listeners to detect changes in the database. When a tutor updates a review, the student's dashboard and the organization leaderboard refresh automatically without a page reload.

### **Security & RLS**
*   **Data Isolation**: Users can only see data belonging to their `org_id`.
*   **Role-Based Access**: Students can see their own scores; Executives can see everything; Mentors can see their team.
