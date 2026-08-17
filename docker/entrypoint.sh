#!/bin/sh
set -e

reset='\033[0m'
bold='\033[1m'
dim='\033[2m'
# Tons claros: céu, água, gelo, menta
sky='\033[38;5;117m'
aqua='\033[38;5;87m'
ice='\033[38;5;159m'
mint='\033[38;5;122m'
foam='\033[38;5;121m'
spring='\033[38;5;157m'
soft='\033[38;5;229m'

port="${PUBLISH_PORT:-${PORT:-80}}"
url="http://localhost:${port}"

printf '\n'
printf '%b\n' "${bold}${sky}     █████╗ ████████╗██╗      █████╗ ███████╗${reset}"
printf '%b\n' "${bold}${aqua}    ██╔══██╗╚══██╔══╝██║     ██╔══██╗██╔════╝${reset}"
printf '%b\n' "${bold}${ice}    ███████║   ██║   ██║     ███████║███████╗${reset}"
printf '%b\n' "${bold}${mint}    ██╔══██║   ██║   ██║     ██╔══██║╚════██║${reset}"
printf '%b\n' "${bold}${foam}    ██║  ██║   ██║   ███████╗██║  ██║███████║${reset}"
printf '%b\n' "${spring}    ╚═╝  ╚═╝   ╚═╝   ╚══════╝╚═╝  ╚═╝╚══════╝${reset}"
printf '\n'
printf '%b\n' "${bold}${ice}    ███████╗██████╗  ██████╗ ███╗   ██╗████████╗███████╗███╗   ██╗██████╗${reset}"
printf '%b\n' "${bold}${aqua}    ██╔════╝██╔══██╗██╔═══██╗████╗  ██║╚══██╔══╝██╔════╝████╗  ██║██╔══██╗${reset}"
printf '%b\n' "${bold}${sky}    █████╗  ██████╔╝██║   ██║██╔██╗ ██║   ██║   █████╗  ██╔██╗ ██║██║  ██║${reset}"
printf '%b\n' "${bold}${mint}    ██╔══╝  ██╔══██╗██║   ██║██║╚██╗██║   ██║   ██╔══╝  ██║╚██╗██║██║  ██║${reset}"
printf '%b\n' "${bold}${foam}    ██║     ██║  ██║╚██████╔╝██║ ╚████║   ██║   ███████╗██║ ╚████║██████╔╝${reset}"
printf '%b\n' "${spring}    ╚═╝     ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═══╝   ╚═╝   ╚══════╝╚═╝  ╚═══╝╚═════╝${reset}"
printf '\n'
printf '%b\n' "  ${bold}${sky}Atlas${reset} ${bold}${mint}FrontEnd${reset}${dim}  ·  wiki corporativa${reset}"
printf '%b\n' "  ${dim}─────────────────────────────────────────────${reset}"
printf '%b\n' "  ${bold}Status${reset}      ${foam}● online${reset}"
printf '%b\n' "  ${bold}Porta${reset}       ${soft}${port}${reset}"
printf '%b\n' "  ${bold}UI${reset}          ${aqua}${url}${reset}"
printf '%b\n' "  ${bold}API${reset}         ${ice}${url}/api/v1${reset} ${dim}→ ${API_UPSTREAM:-http://host.docker.internal:8080}${reset}"
printf '%b\n' "  ${bold}Engine${reset}      ${dim}nginx${reset}"
printf '%b\n' "  ${dim}─────────────────────────────────────────────${reset}"
printf '%b\n' "  ${soft}Parar${reset}       Ctrl+C"
printf '\n'

export NGINX_ENTRYPOINT_QUIET_LOGS=1
exec /docker-entrypoint.sh nginx -g 'daemon off;'
