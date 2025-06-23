-- Debug script to check tasks in database
-- Run this in your Neon SQL console to see what's in the database

-- Check all users
SELECT id, username, created_at FROM users;

-- Check all goals
SELECT g.id, g.title, g.description, g.target_date, u.username 
FROM goals g 
JOIN users u ON g.user_id = u.id;

-- Check all tasks
SELECT 
    t.id,
    t.goal_id,
    g.title as goal_title,
    t.type,
    t.description,
    t.points,
    t.completed,
    t.date,
    t.is_template,
    t.created_at,
    u.username
FROM tasks t
JOIN goals g ON t.goal_id = g.id
JOIN users u ON g.user_id = u.id
ORDER BY t.created_at DESC;

-- Check today's tasks specifically
SELECT 
    t.id,
    t.goal_id,
    g.title as goal_title,
    t.type,
    t.description,
    t.points,
    t.completed,
    t.date,
    t.is_template,
    u.username
FROM tasks t
JOIN goals g ON t.goal_id = g.id
JOIN users u ON g.user_id = u.id
WHERE t.date = CURRENT_DATE
ORDER BY t.created_at DESC;

-- Check template tasks
SELECT 
    t.id,
    t.goal_id,
    g.title as goal_title,
    t.type,
    t.description,
    t.points,
    t.is_template,
    u.username
FROM tasks t
JOIN goals g ON t.goal_id = g.id
JOIN users u ON g.user_id = u.id
WHERE t.is_template = true
ORDER BY t.created_at DESC;
