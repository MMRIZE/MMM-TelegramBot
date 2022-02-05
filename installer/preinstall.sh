#!/bin/bash
# +-----------------+
# | npm postinstall |
# | @bugsounet      |
# +-----------------+

# get the installer directory
Installer_get_current_dir () {
  SOURCE="${BASH_SOURCE[0]}"
  while [ -h "$SOURCE" ]; do
    DIR="$( cd -P "$( dirname "$SOURCE" )" && pwd )"
    SOURCE="$(readlink "$SOURCE")"
    [[ $SOURCE != /* ]] && SOURCE="$DIR/$SOURCE"
  done
  echo "$( cd -P "$( dirname "$SOURCE" )" && pwd )"
}

Installer_dir="$(Installer_get_current_dir)"

# move to installler directory
cd "$Installer_dir"

source utils.sh

# use beep request questions ?
Installer_beep=false

# check version in package.json file
Installer_version="$(grep -Eo '\"version\"[^,]*' ../package.json | grep -Eo '[^:]*$' | awk  -F'\"' '{print $2}')"
Installer_module="$(grep -Eo '\"name\"[^,]*' ../package.json | grep -Eo '[^:]*$' | awk  -F'\"' '{print $2}')"

# Let's start !
Installer_info "Welcome to $Installer_module v$Installer_version"

echo

# Check not run as root
if [ "$EUID" -eq 0 ]; then
  Installer_error "npm install must not be used as root"
  exit 1
fi

# Check platform compatibility
Installer_info "Checking OS..."
Installer_checkOS
if  [ "$platform" == "osx" ]; then
  Installer_error "OS Detected: $OSTYPE ($os_name $os_version $arch)"
  Installer_error "You need to install manually 'scrot' program for using 'screenshot' function"
  exit 0
else
  Installer_success "OS Detected: $OSTYPE ($os_name $os_version $arch)"
  dependencies=(scrot)
  [ "${__NO_DEP_CHECK__}" ] || {
    Installer_info "Checking all dependencies..."
    Installer_check_dependencies
    Installer_success "All Dependencies needed are installed !"
  }
fi

echo

Installer_info "Installing all library..."
echo
