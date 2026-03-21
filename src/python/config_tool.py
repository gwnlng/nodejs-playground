import argparse
import datetime
import os
import snyk


SNYK_TOKEN = os.getenv("SNYK_TOKEN")
snyk_client = snyk.SnykClient(SNYK_TOKEN, tries=3, delay=1, backoff=2)
LOG_FILE_DATETIME_FORMAT = f"{datetime.datetime.now():%Y%m%d%H%M%S}"
LOG_FILENAME = f"snyk-projects-bulkaction_log_{LOG_FILE_DATETIME_FORMAT}.log"


def parse_command_line_args():
    """
    Parse command-line arguments
    :return:
    """
    parser = argparse.ArgumentParser(description='Launch Snyk Projects bulk action API call')
    parser.add_argument(
        "--group-id",
        type=str,
        help="The Snyk Group ID found in Group > Settings.",
        required=True
    )
    parser.add_argument(
        "--org-id",
        type=str,
        help="The Snyk Organization ID found in Organization > Settings. \
            If omitted, process all organizations of Snyk Group token has access to.",
        required=False
    )
    parser.add_argument(
        "--api-action",
        help="Projects bulk API action",
        required=True,
        choices=['deactivate', 'activate', 'delete']
    )
    parser.add_argument(
        "--projects-per-batch",
        type=int,
        help="Projects per batch size",
        required=False
    )

    return parser.parse_args()
