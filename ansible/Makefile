build:
	@echo ${stack} ${key}
	PYTHONUNBUFFERED=1 ansible-playbook playbooks/app.yml -e "stack_name=${stack}" -e "keyname=${key}"
