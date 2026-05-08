# Excel Data Summary

The source workbook was inspected and converted into JSON seed files.

## Sheets used

- `Main` → workload records
- `Member` → staff users
- `DataList` → duty categories and minor-task options

## Imported record structure

| Excel column | App field |
|---|---|
| วันที่ | `date` |
| เวลา | `time` |
| ผู้ให้บริการ | `employeeNickname` |
| ผู้รับบริการ | `recipient` |
| หัวข้อการให้บริการ | `mainDuty` |
| หัวข้อการให้บริการ(หัวข้อรอง) | `minorTask` |
| Comment | `comment` |
| สถานะ | `status` |

## Minor-task mapping

The items you were unsure how to map are stored as `minorTask`. They are still filterable, searchable, countable in dashboard summaries, and exported in CSV.
