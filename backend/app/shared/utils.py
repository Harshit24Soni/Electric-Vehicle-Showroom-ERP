import csv
from io import StringIO
from fastapi.responses import StreamingResponse


def sanitize_csv_field(value) -> str:
    """
    Prevent CSV formula injection.
    Prefixes dangerous characters with a single quote to prevent
    execution in spreadsheet applications like Excel.
    """
    if isinstance(value, str) and value.startswith(('=', '+', '-', '@', '\t', '\r')):
        return "'" + value
    return value


def export_csv(headers, rows, filename):
    buffer = StringIO()
    writer = csv.writer(buffer)
    writer.writerow(headers)
    for row in rows:
        writer.writerow([sanitize_csv_field(field) for field in row])

    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        },
    )
