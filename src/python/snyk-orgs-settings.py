import json
import os
import config_tool
import snyk
import sys


def dump_orgs_data(group_id, orgs):
    """
    Dumps out json orgs format data for api-import
    :param orgs:
    :return:
    """
    json_data = {}
    try:
        for org in orgs:
            org_id = org['id']
            org['orgId'] = org_id
            print(f"calling org/{org_id}/integrations API...")
            resp = config_tool.snyk_client.get(f"org/{org_id}/integrations")
            if resp.status_code != 200:
                raise snyk.errors.SnykHTTPError(resp.reason)

            integrations = json.loads(resp.text)
            org['integrations'] = integrations
            org['groupId'] = group_id
    except snyk.errors.SnykHTTPError as snyk_err:
        print(f"Error encountered with Snyk API /integrations: {str(snyk_err)}")

    json_data['orgData'] = orgs
    with open("snyk-created-orgs.json", "w") as fp:
        json.dump(json_data, fp, indent=2)

    print("Exported snyk-created-orgs.json")


# https://snyk.docs.apiary.io/#reference/groups/list-all-organizations-in-a-group/list-all-organizations-in-a-group
def list_all_orgs(group_id, org_name=None, per_page=100):
    """
    List all Snyk organizations in a Snyk group from snyk api query and response
    :param group_id: group id (string)
    :param org_name: organization name starting with this value case-insensitive (str)
    :param per_page: The number of results to return (maximum is 100) (int)
    :return: org_ids (list)
    """
    orgs = []
    page_num = 1
    name_param = f"&name={org_name}" if org_name else ""
    try:
        print(f"calling page {page_num} at group/{group_id}/orgs API...")
        resp = config_tool.snyk_client.get(f"group/{group_id}/orgs?perPage={per_page}&page={page_num}{name_param}")
        if resp.status_code != 200:
            raise snyk.errors.SnykHTTPError(resp.reason)
        resp_body = json.loads(resp.text)
        orgs_list = resp_body['orgs']

        # see link above for response body to paginated request
        while orgs_list:
            # extract orgs attribute from json
            orgs.extend(orgs_list)
            page_num += 1
            print(f"calling page {page_num} at group/{group_id}/orgs API...")
            resp = config_tool.snyk_client.get(f"group/{group_id}/orgs?perPage={per_page}&page={page_num}{name_param}")
            if resp.status_code != 200:
                raise snyk.errors.SnykHTTPError(resp.reason)
            resp_body = json.loads(resp.text)
            orgs_list = resp_body['orgs']
    except snyk.errors.SnykHTTPError as snyk_err:
        print(f"Error encountered with Snyk API /orgs: {str(snyk_err)}")

    return orgs


def generate_orgs_data(cli_arguments):
    """
    Generates orgs data for api-import
    :param cli_arguments: CLI arguments (Namespace)
    :return:
    """
    # dump orgsData json map required at snyk-api-import step 4
    orgs = list_all_orgs(cli_arguments.group_id, org_name=cli_arguments.orgNameStartsWith)
    dump_orgs_data(cli_arguments.group_id, orgs)


if __name__ == '__main__':
    if not os.getenv("SNYK_TOKEN"):
        print("token not set at $SNYK_TOKEN")
        sys.exit(1)

    # parse the arguments
    cli_args = config_tool.parse_command_line_args()
    generate_orgs_data(cli_args)
