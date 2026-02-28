#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DEMO_DIR="$SCRIPT_DIR/demo-repo"

if [ -d "$DEMO_DIR" ]; then
  echo "Demo repo already exists at $DEMO_DIR"
  echo "Remove it first:  rm -rf $DEMO_DIR"
  exit 1
fi

mkdir -p "$DEMO_DIR"
cd "$DEMO_DIR"

git init
git checkout -b main

# ── Commit 1: Initial employee dataset ───────────────────────────
cat > employees.csv << 'CSV'
Name,Department,Salary,Start Date
Alice Johnson,Engineering,95000,2021-03-15
Bob Smith,Engineering,92000,2021-06-01
Carol Davis,Marketing,78000,2022-01-10
David Wilson,Sales,72000,2022-04-20
Emma Brown,Engineering,98000,2020-11-05
Frank Miller,Marketing,75000,2022-07-12
Grace Lee,Sales,70000,2023-01-08
Henry Taylor,Engineering,105000,2019-08-22
Irene Chen,HR,82000,2021-09-30
Jack Anderson,Sales,68000,2023-03-14
CSV

cat > .gitattributes << 'ATTR'
*.csv diff=csv
ATTR

git add .
git commit -m "Initial employee dataset"

# ── Commit 2: Add new hires for Q2 ───────────────────────────────
cat > employees.csv << 'CSV'
Name,Department,Salary,Start Date
Alice Johnson,Engineering,95000,2021-03-15
Bob Smith,Engineering,92000,2021-06-01
Carol Davis,Marketing,78000,2022-01-10
David Wilson,Sales,72000,2022-04-20
Emma Brown,Engineering,98000,2020-11-05
Frank Miller,Marketing,75000,2022-07-12
Grace Lee,Sales,70000,2023-01-08
Henry Taylor,Engineering,105000,2019-08-22
Irene Chen,HR,82000,2021-09-30
Jack Anderson,Sales,68000,2023-03-14
Karen White,Engineering,90000,2024-04-01
Leo Martinez,Marketing,76000,2024-04-15
CSV

git add employees.csv
git commit -m "Add new hires for Q2"

# ── Branch: feature/budget-update ─────────────────────────────────
git checkout -b feature/budget-update

cat > employees.csv << 'CSV'
Name,Department,Salary,Start Date
Alice Johnson,Engineering,102000,2021-03-15
Bob Smith,Engineering,99000,2021-06-01
Carol Davis,Marketing,78000,2022-01-10
David Wilson,Sales,72000,2022-04-20
Emma Brown,Engineering,108000,2020-11-05
Frank Miller,Marketing,75000,2022-07-12
Grace Lee,Sales,70000,2023-01-08
Henry Taylor,Engineering,115000,2019-08-22
Irene Chen,HR,82000,2021-09-30
Jack Anderson,Sales,68000,2023-03-14
Karen White,Engineering,96000,2024-04-01
Leo Martinez,Marketing,76000,2024-04-15
CSV

git add employees.csv
git commit -m "Update engineering salaries"

# ── Back to main: add marketing team members ─────────────────────
git checkout main

cat > employees.csv << 'CSV'
Name,Department,Salary,Start Date
Alice Johnson,Engineering,95000,2021-03-15
Bob Smith,Engineering,92000,2021-06-01
Carol Davis,Marketing,78000,2022-01-10
David Wilson,Sales,72000,2022-04-20
Emma Brown,Engineering,98000,2020-11-05
Frank Miller,Marketing,75000,2022-07-12
Grace Lee,Sales,70000,2023-01-08
Henry Taylor,Engineering,105000,2019-08-22
Irene Chen,HR,82000,2021-09-30
Jack Anderson,Sales,68000,2023-03-14
Karen White,Engineering,90000,2024-04-01
Leo Martinez,Marketing,76000,2024-04-15
Mia Robinson,Marketing,73000,2024-05-01
Noah Garcia,Marketing,71000,2024-05-15
CSV

git add employees.csv
git commit -m "Add marketing team members"

echo ""
echo "Demo repo created at: $DEMO_DIR"
echo ""
echo "Branches:"
git branch
echo ""
echo "Log (main):"
git log --oneline
echo ""
echo "Open this folder in Ledgit to explore branch switching, diffs, and commits."
