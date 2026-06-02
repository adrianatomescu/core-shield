# CoreShield ML

This module trains the alert-classification model used by the CoreShield SOAR
prototype. It uses UNSW-NB15 network events for binary classification:

- `0` - normal traffic
- `1` - attack traffic

The saved Random Forest pipeline estimates the probability that a structured
network event represents an attack. CoreShield automation rules must decide
whether an alert is blocked automatically or sent to an analyst for review.

## One-command interface

Run the following commands from `project/ml`:

```bash
./ml.sh help
./ml.sh setup
```

Remove generated reports before a fresh run:

```bash
./delete.sh
```

This deletes only generated files from `reports/`. It keeps the downloaded
dataset, saved model and virtual environment.

## Download and inspect the dataset

```bash
./ml.sh download
./ml.sh inspect
./ml.sh explore
```

The download script stores the Kaggle dataset files in `data/unswnb15`. The
loader supports the Parquet format currently published by the selected Kaggle
dataset and CSV variants. Data files are intentionally excluded from Git.

`./ml.sh explore` exports:

```text
reports/dataset/training_preview.csv
reports/dataset/testing_preview.csv
reports/dataset/dataset_summary.json
reports/dataset/REPORT.md
reports/dataset/label_distribution.png
reports/dataset/attack_categories.png
reports/dataset/numeric_correlations.png
```

Open `reports/dataset/REPORT.md` for explanations and embedded charts. Open the
CSV preview files in the IDE to inspect individual events.

## Train and evaluate

```bash
./ml.sh train
```

Training compares Logistic Regression with Random Forest. The Logistic
Regression result is the baseline; the Random Forest pipeline is saved for
application integration:

```text
models/random_forest_unswnb15.joblib
reports/training_metrics.json
reports/models/REPORT.md
```

`attack_cat` is excluded from the feature set because it describes the known
attack category and would leak target information into binary classification.
The training script also removes duplicate rows and test events already present
in the training split before computing metrics.

Open `reports/models/REPORT.md` after training. It contains explanations and
links to:

- the Logistic Regression and Random Forest confusion matrices;
- the model-comparison chart;
- the ROC curves;
- the Random Forest feature-importance chart.

## Predict one event

Create a JSON object containing the same structured fields used by UNSW-NB15,
then run:

```bash
python -m src.predict path/to/event.json
```

For a quick local smoke test, classify an event directly from the test split:

```bash
./ml.sh predict 0
```

## Simulate alerts for the SOAR demo

Generate controlled random alerts sampled from the test split:

```bash
./ml.sh simulate 5
```

The model estimates the attack probability. A small illustrative SOAR policy
then marks each alert as `monitor_only`, `analyst_review`, or
`automation_candidate`. The simulator also displays ground truth only so that
the demo can show whether each prediction was correct.
