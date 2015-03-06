/*
 callblocker - blocking unwanted calls from your home phone
 Copyright (C) 2015-2015 Patrick Ammann <pammann@gmx.net>

 This program is free software; you can redistribute it and/or
 modify it under the terms of the GNU General Public License
 as published by the Free Software Foundation; either version 3
 of the License, or (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with this program; if not, write to the Free Software
 Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA 02111-1307, USA.
*/

#ifndef SETTINGS_H
#define SETTINGS_H

#include <string>
#include <sstream>
#include <vector>

#include "Notify.h"
struct json_object;


enum SettingBlockMode {
  LOGGING_ONLY = 0,             // number is never blocked, only logging
  WHITELISTS_ONLY,              // number has to be in a whitelists (blacklists not used)
  WHITELISTS_AND_BLACKLISTS,    // number is blocked, when in a blacklists and NOT in a whitelists (default)
  BLACKLISTS_ONLY               // number is blocked, when in a blacklists (whitelists not used)
};

struct SettingSipAccount {
  enum SettingBlockMode blockMode;
  std::string fromDomain;
  std::string fromUsername;
  std::string fromPassword;

  std::string toString() {
    std::ostringstream oss;
    oss << blockMode << ", " << fromDomain << ", " << fromUsername << ", " << fromPassword;
    return oss.str();
  }
};

struct SettingAnalogPhone {
  enum SettingBlockMode blockMode;
  std::string device;

  std::string toString() {
    std::ostringstream oss;
    oss << blockMode << ", " << device;
    return oss.str();
  }
};

class Settings : public Notify {
private:
  std::string m_filename;
  std::vector<struct SettingSipAccount> m_sipAccounts;
  std::vector<struct SettingAnalogPhone> m_analogPhones;

public:
  Settings();
  virtual ~Settings();
  bool run();
  std::vector<struct SettingSipAccount> getSipAccounts() { return m_sipAccounts; }
  std::vector<struct SettingAnalogPhone> getAnalogPhones() { return m_analogPhones; }
  void dump();

private:
  void clear();
  bool load();
  bool getObject(struct json_object* objbase, const char* objname, std::string* res);
  bool getObject(struct json_object* objbase, const char* objname, int* res);
  bool getObject(struct json_object* objbase, const char* objname, bool* res);
  bool getBlockMode(struct json_object* objbase, enum SettingBlockMode* res);
};

#endif
