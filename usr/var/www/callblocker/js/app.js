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

// Useful links:
// http://amagard.x10.mx/dojo_icon_classes.html
// http://kennethfranqueiro.com/2010/06/custom-save-logic-itemfilewritestore/

require(["dijit/ConfirmDialog",
         "dojo/dom-construct",
         "dojo/keys",
         "dojo/data/ItemFileWriteStore",
         "dojo/date/locale",
         "dojo/data/ItemFileWriteStore",
         "dojox/data/QueryReadStore",
         "dojox/grid/DataGrid",
         "dojox/grid/EnhancedGrid",
         "dojox/grid/enhanced/plugins/Menu",
         "dijit/Tree",
         "dijit/Menu",
         "dijit/MenuItem",
         "dijit/tree/TreeStoreModel",
//         "dijit/form/Form",
         "dijit/form/CheckBox",
         "dijit/form/Button",
         "dijit/form/Select",
         "dijit/form/ValidationTextBox",
         "dijit/layout/ContentPane",
         "dijit/layout/LayoutContainer",
         "dijit/layout/BorderContainer",
        ], function(ConfirmDialog, domConstruct) { // workaround

  function formatDate(timestamp) {
    if (timestamp) {
      var date = new Date(timestamp);
      return dojo.date.locale.format(date, {formatLength: "long"});
    }
    return "";
  }

  function createCallerLogGrid() {
    var store = new dojox.data.QueryReadStore({
      url: "callerlog.php"
    });
    var structure = [
      { name: "Date",      field: "TIMESTAMP", width:"150px", formatter: formatDate},
      { name: "Number",    field: "NUMBER",    width:"120px"},
      { name: "Name",      field: "NAME",      width:"200px"},
      { name: "Blocked",   field: "BLOCKED",   width:"120px", hidden:true},
      { name: "Whitelist", field: "WHITELIST", width:"300px"},
      { name: "Blacklist", field: "BLACKLIST", width:"300px"},
      { name: "Score",     field: "SCORE",     width:"50px"}
    ];

    // TODO factor out common stuff
    var menu = new dijit.Menu();
    var addToWhitelistMenuItem = new dijit.MenuItem({
      label: "Add to whitelist",
      onClick: function(){
        var items = grid.selection.getSelected();
        if (items.length) {
          var listStore = createListStore("list.php?dirname=whitelists");
          dojo.forEach(items, function(si){
            if (si !== null) {
              var newItem = { timestamp: Date.now(),
                              number: grid.store.getValue(si, "NUMBER"), name: grid.store.getValue(si, "NAME")};
              listStore.newItem(newItem);
            }
          });
          listStore.save();
        } 
      }
    });
    var addToBlacklistMenuItem = new dijit.MenuItem({
      label: "Add to blacklist",
      onClick: function(){
        var items = grid.selection.getSelected();
        if (items.length) {
          var listStore = createListStore("list.php?dirname=blacklists");
          dojo.forEach(items, function(si){
            if (si !== null) {
              var newItem = { timestamp: Date.now(),
                              number: grid.store.getValue(si, "NUMBER"), name: grid.store.getValue(si, "NAME")};
              listStore.newItem(newItem);
            }
          });
          listStore.save();
        } 
      }
    });
    menu.addChild(addToWhitelistMenuItem);
    menu.addChild(addToBlacklistMenuItem);

    var grid = new dojox.grid.EnhancedGrid({
      store: store,
      structure: structure,
      canSort:function(){return false}, // disable sorting, its not implemented on backend
      selectable: true,
      plugins : {menus: menusObject = {rowMenu: menu}},
      style:"height:100%; width:100%;"
    });
    // setup colors
    dojo.connect(grid, 'onStyleRow', this, function (row) {
      var item = grid.getItem(row.index);
      if (item != null) {
        if (item.i.BLOCKED.indexOf("blocked") != -1) {
          row.customClasses = "blockedRow";
        } else if (item.i.WHITELIST) {
          row.customClasses = "whitelistRow";
        }
      }
    });
    return grid;
  }

  function createJournalGrid(url) {
    var store = new dojox.data.QueryReadStore({
      url: url
    });
    var structure = [
      { name: "Date",     field: "TIMESTAMP", width:"150px", formatter: formatDate},
      { name: "PrioId",   field: "PRIO_ID",   width:"50px", hidden:true},
      { name: "Priority", field: "PRIORITY",  width:"70px"},
      { name: "Message",  field: "MESSAGE",   width:"100%"}
    ];
    var grid = new dojox.grid.EnhancedGrid({
      //id: "myGridId",
      store: store,
      structure: structure,
      canSort:function(){return false}, // disable sorting, its not implemented on backend
      selectable: true,
      style:"height:100%; width:100%;"
    });
    // setup colors
    dojo.connect(grid, 'onStyleRow', this, function (row) {
      var item = grid.getItem(row.index);
      if (item != null) {
        if (item.i.PRIO_ID <= 3) {
          row.customClasses = "errorRow";
        } else if (item.i.PRIO_ID == 4) {
          row.customClasses = "warnRow";
        }
      }
    });
    return grid;
  }

  function createJournalErrorWarnGrid() {
    return createJournalGrid("journal.php");
  }

  function createJournalAllGrid() {
    return createJournalGrid("journal.php?all=1");
  }

  function createListStore(url) {
    var store = new dojo.data.ItemFileWriteStore({
      url: url
    });
    store._saveEverything = function(saveCompleteCallback, saveFailedCallback, newFileContentString) {
      dojo.xhrPost({
        url: store.url,
        content: {data: newFileContentString},
        load: saveCompleteCallback,
        error: saveFailedCallback
      });
    }
    return store;
  }

  function createPhone() {
    var typeSelect = new dijit.form.Select({
      options: [
        { label: "SIP Phone", value: "sip", selected: true },
        { label: "Analog Phone", value: "analog" }
      ]
    });
    function selectType(isSIP) {
      deviceTextBox.set("disabled", isSIP);
      fromDomainTextBox.set("disabled", !isSIP);
      fromUsernameTextBox.set("disabled", !isSIP);
      fromPasswordTextBox.set("disabled", !isSIP);
    }
    dojo.connect(typeSelect, "onChange", function(evt) {
      selectType(evt == "sip");
    });
    var enabledCheckBox = new dijit.form.CheckBox({
      checked: true,
    });
    var nameTextBox = new dijit.form.ValidationTextBox({
      placeHolder: "name"
    });
    var countryCodeTextBox = new dijit.form.ValidationTextBox({
      placeHolder: "country code",
      required: true,
      pattern: "\\+[0-9]{1,4}",
      invalidMessage: "Not a valid counry code (+...)"
    });
    var blockModeSelect = new dijit.form.Select({
      options: [
        { label: "logging only", value: "logging_only", selected: true },
        { label: "whitelists only", value: "whitelists_only" },
        { label: "whitelists and blacklists", value: "whitelists_and_blacklists" },
        { label: "blacklists only", value: "blacklists_only" }
      ]
    });
    var blockAnonymousCIDCheckBox = new dijit.form.CheckBox({
      checked: false,
    });
    var onlineCheckSelect = new dijit.form.Select({
      options: [
        { label: "none", value: "", selected: true },
        { label: "phonespamfilter.com", value: "phonespamfilter_com" },
        { label: "whocalled.us", value: "whocalled_us" },
        { label: "tellows.de", value: "tellows_de" },
      ]
    });
    var onlineLookupSelect = new dijit.form.Select({
      options: [
        { label: "none", value: "", selected: true },
        { label: "tel.search.ch", value: "tel_search_ch" },
      ]
    });
    var deviceTextBox = new dijit.form.ValidationTextBox({
      placeHolder: "device",
      pattern: "/dev/.*",
      invalidMessage: "Not a valid device name (/dev/...)"
    });
    var fromDomainTextBox = new dijit.form.ValidationTextBox({
      placeHolder: "from domain"
    });
    var fromUsernameTextBox = new dijit.form.ValidationTextBox({
      placeHolder: "from username"
    });
    var fromPasswordTextBox = new dijit.form.ValidationTextBox({
      placeHolder: "from password",
      type: "password"
    });

    var phoneStore = createListStore("phones.php");
    var structure = [
      { name:"Enabled",             field:"enabled",             width:"50px"},
      { name:"Name",                field:"name",                width:"100px"},
      { name:"Country code",        field:"country_code",        width:"50px"},
      { name:"Block mode",          field:"block_mode",          width:"120px"},
      { name:"Block anonymous CID", field:"block_anonymous_cid", width:"60px"},
      { name:"Online check",        field:"online_check",        width:"100px"},
      { name:"Online lookup",       field:"online_lookup",       width:"100px"},
      { name:"Device",              field:"device",              width:"100px"},
      { name:"From domain",         field:"from_domain",         width:"160px"},
      { name:"From username",       field:"from_username",       width:"160px"},
      { name:"From password",       field:"from_password",       width:"160px",
        type:dojox.grid.cells._Widget, formatter:function(str){return new dijit.form.TextBox({value : str, type: "password"});}
      },
    ];

    var menu = new dijit.Menu();
    var editMenuItem = new dijit.MenuItem({
      label: "Edit",
      onClick: function(){
        var items = grid.selection.getSelected();
        if (items.length) {
          var si = items[0];
          var myDialog = new ConfirmDialog({
            title: "Edit entry",
            content: [
              domConstruct.create("T", {innerHTML:"Type: "}), typeSelect.domNode, domConstruct.create("br"),
              domConstruct.create("T", {innerHTML:"Enabled: "}), enabledCheckBox.domNode, domConstruct.create("br"),
              domConstruct.create("T", {innerHTML:"Name: "}), nameTextBox.domNode, domConstruct.create("br"),
              domConstruct.create("T", {innerHTML:"Country code: "}), countryCodeTextBox.domNode, domConstruct.create("br"),
              domConstruct.create("T", {innerHTML:"Block mode: "}), blockModeSelect.domNode, domConstruct.create("br"),
              domConstruct.create("T", {innerHTML:"Block anonymous CID: "}), blockAnonymousCIDCheckBox.domNode, domConstruct.create("br"),
              domConstruct.create("T", {innerHTML:"Online check: "}), onlineCheckSelect.domNode, domConstruct.create("br"),
              domConstruct.create("T", {innerHTML:"Online lookup: "}), onlineLookupSelect.domNode, domConstruct.create("br"),
              domConstruct.create("T", {innerHTML:"Device: "}), deviceTextBox.domNode, domConstruct.create("br"),
              domConstruct.create("T", {innerHTML:"From domain: "}), fromDomainTextBox.domNode, domConstruct.create("br"),
              domConstruct.create("T", {innerHTML:"From username: "}), fromUsernameTextBox.domNode, domConstruct.create("br"),
              domConstruct.create("T", {innerHTML:"From password: "}), fromPasswordTextBox.domNode, domConstruct.create("br"),
            ],
            onExecute:function() {
              if (!nameTextBox.isValid()) return;
              if (typeSelect.get("value") == "analog") {
                if (!deviceTextBox.isValid()) return;
                grid.store.setValue(si, "device", deviceTextBox.get("value"));
                grid.store.setValue(si, "from_domain", "");
                grid.store.setValue(si, "from_username", "");
                grid.store.setValue(si, "from_password", "");
              } else {
                if (!fromDomainTextBox.isValid()) return;
                if (!fromUsernameTextBox.isValid()) return;
                if (!fromPasswordTextBox.isValid()) return;
                grid.store.setValue(si, "device", "");
                grid.store.setValue(si, "from_domain", fromDomainTextBox.get("value"));
                grid.store.setValue(si, "from_username", fromUsernameTextBox.get("value"));
                grid.store.setValue(si, "from_password", fromPasswordTextBox.get("value"));
              }
              grid.store.setValue(si, "enabled", enabledCheckBox.get("checked"));
              grid.store.setValue(si, "name", nameTextBox.get("value"));
              grid.store.setValue(si, "country_code", countryCodeTextBox.get("value"));
              grid.store.setValue(si, "block_mode", blockModeSelect.get("value"));
              grid.store.setValue(si, "block_anonymous_cid", blockAnonymousCIDCheckBox.get("checked"));
              grid.store.setValue(si, "online_check", onlineCheckSelect.get("value"));
              grid.store.setValue(si, "online_lookup", onlineLookupSelect.get("value"));
              grid.store.save();
            }
          });

          if (grid.store.getValue(si, "device")) {
            typeSelect.set("value", "analog");
            deviceTextBox.set("value", grid.store.getValue(si, "device"));
          } else {
            typeSelect.set("value", "sip");
            fromDomainTextBox.set("value", grid.store.getValue(si, "from_domain"));
            fromUsernameTextBox.set("value", grid.store.getValue(si, "from_username"));
            fromPasswordTextBox.set("value", grid.store.getValue(si, "from_password"));
          }
          enabledCheckBox.set("value", grid.store.getValue(si, "enabled"));
          nameTextBox.set("value", grid.store.getValue(si, "name"));
          countryCodeTextBox.set("value", grid.store.getValue(si, "country_code"));
          blockModeSelect.set("value", grid.store.getValue(si, "block_mode"));
          blockAnonymousCIDCheckBox.set("value", grid.store.getValue(si, "block_anonymous_cid"));
          onlineCheckSelect.set("value", grid.store.getValue(si, "online_check"));
          onlineLookupSelect.set("value", grid.store.getValue(si, "online_lookup"));
          myDialog.show();
        }
      },
      //iconClass: "dijitEditorIcon dijitEditorIconDelete"
    });
    menu.addChild(editMenuItem);

    var grid = new dojox.grid.EnhancedGrid({
      store: phoneStore,
      structure: structure,
      canSort:function(){return false}, // disable sorting, its not implemented on backend
      selectable: true,
      plugins : {menus: menusObject = {rowMenu: menu}},
      style:"height:100%; width:100%;",
    });
/*
    grid.layout.setColumnVisibility(7, false);
    grid.layout.setColumnVisibility(8, false);
    grid.layout.setColumnVisibility(9, false);
*/
    return grid;
  }

  function createOnlineCredentials(url) {
    var nameSelect = new dijit.form.Select({
      options: [
        { label: "tellows_de",   value: "tellows_de"},
        { label: "whocalled_us", value: "whocalled_us" },
      ]
    });
    var usernameTextBox = new dijit.form.ValidationTextBox({
      placeHolder: "username",
      required: true,
    });
    var passwordTextBox = new dijit.form.ValidationTextBox({
      placeHolder: "password"
    });

    var listStore = createListStore("online_credentials.php");
    var structure = [
      { name: "Name",      field: "name",     width:"150px"},
      { name: "Username",  field: "username", width:"120px"},
      { name: "Password",  field: "password", width:"200px"}
    ];

    var menu = new dijit.Menu();
    var deleteMenuItem = new dijit.MenuItem({
      label: "Delete",
      onClick: function(){
        var items = grid.selection.getSelected();
        if (items.length) {
          dojo.forEach(items, function(si){
            if (si !== null) {
              grid.store.deleteItem(si);
            }
          });
          grid.store.save();
        } 
      },
      iconClass: "dijitEditorIcon dijitEditorIconDelete"
    });
    var editMenuItem = new dijit.MenuItem({
      label: "Edit",
      onClick: function(){
        var items = grid.selection.getSelected();
        if (items.length) {
          var si = items[0];
          var myDialog = new ConfirmDialog({
            title: "Edit entry",
            content: [nameSelect.domNode, usernameTextBox.domNode, passwordTextBox.domNode],
            onExecute: function() {
              if (usernameTextBox.isValid() && passwordTextBox.isValid()) {
                grid.store.setValue(si, "name", nameSelect.get("value"));
                grid.store.setValue(si, "username", usernameTextBox.get("value"));
                grid.store.setValue(si, "password", passwordTextBox.get("value"));
                grid.store.save();
              }
            }
          });
          nameSelect.set("value", grid.store.getValue(si, "name"));
          usernameTextBox.set("value", grid.store.getValue(si, "username"));
          passwordTextBox.set("value", grid.store.getValue(si, "password"));
          myDialog.show();
        }
      },
      //iconClass: "dijitEditorIcon dijitEditorIconDelete"
    });
    menu.addChild(deleteMenuItem);
    menu.addChild(editMenuItem);

    var grid = new dojox.grid.EnhancedGrid({
      store: listStore,
      structure: structure,
      canSort: function(){return false}, // disable sorting, its not implemented on backend
      selectable: true,
      plugins : {menus: menusObject = {rowMenu: menu}},
      style: "height:100%; width:100%;",
      region: "center",
    });

    var addNewEntry = new dijit.form.Button({
      label: "Add new entry",
      onClick: function() {
        var myDialog = new ConfirmDialog({
          title: "Add new entry",
          content: [nameSelect.domNode, usernameTextBox.domNode, passwordTextBox.domNode],
          onExecute:function() {
            if (usernameTextBox.isValid() && passwordTextBox.isValid()) {
              var newItem = {name: nameSelect.get("value"), username: usernameTextBox.get("value"), password: passwordTextBox.get("value")};
              grid.store.newItem(newItem);
              grid.store.save();
            }
          }
        });
        myDialog.show();
      },
      region: "top",
    });

    var listLayout = new dijit.layout.LayoutContainer();
    listLayout.addChild(addNewEntry);
    listLayout.addChild(grid);
    return listLayout;
  }

  function createListX(url_param) {
    var numberTextBox = new dijit.form.ValidationTextBox({
      placeHolder: "Number",
      required: true,
      pattern: "\\+[0-9]{4,15}",
      invalidMessage: "Not a valid international number (+...)"
    });
    var nameTextBox = new dijit.form.ValidationTextBox({
      placeHolder: "Name"
    });

    var menu = new dijit.Menu();
    var deleteMenuItem = new dijit.MenuItem({
      label: "Delete",
      onClick: function(){
        var items = grid.selection.getSelected();
        if (items.length) {
          dojo.forEach(items, function(si){
            if (si !== null) {
              grid.store.deleteItem(si);
            }
          });
          grid.store.save();
        } 
      },
      iconClass: "dijitEditorIcon dijitEditorIconDelete"
    });
    var editMenuItem = new dijit.MenuItem({
      label: "Edit",
      onClick: function(){
        var items = grid.selection.getSelected();
        if (items.length) {
          var si = items[0];
          var myDialog = new ConfirmDialog({
            title: "Edit entry",
            content: [numberTextBox.domNode, nameTextBox.domNode],
            onExecute: function() {
              if (numberTextBox.isValid() && nameTextBox.isValid()) {
                grid.store.setValue(si, "timestamp", Date.now());
                grid.store.setValue(si, "number", numberTextBox.get("value"));
                grid.store.setValue(si, "name", nameTextBox.get("value"));
                grid.store.save();
              }
            }
          });
          numberTextBox.set("value", grid.store.getValue(si, "number"));
          nameTextBox.set("value", grid.store.getValue(si, "name"));
          myDialog.show();
        }
      },
      //iconClass: "dijitEditorIcon dijitEditorIconDelete"
    });
    menu.addChild(deleteMenuItem);
    menu.addChild(editMenuItem);

    var structure = [
      { name: "Date",      field: "timestamp", width:"150px", formatter: formatDate},
      { name: "Number",    field: "number",    width:"120px"},
      { name: "Name",      field: "name",      width:"200px"}
    ];

    var grid = new dojox.grid.EnhancedGrid({
      //store: listStore, added later
      structure: structure,
      canSort: function(){return false}, // disable sorting, its not implemented on backend
      selectable: true,
      plugins: {menus: menusObject = {rowMenu: menu}},
      style: "height:100%; width:100%;"
    });
    /*dojo.connect(grid, "onKeyPress", function(evt) {
      if(evt.keyCode === dojo.keys.DELETE) { 
        console.log('delete!'); 
      }
    });*/

    var listsStore = createListStore("lists.php?".concat(url_param));
    var listSelect = new dijit.form.Select({
      store: listsStore,
      placeHolder: "Select a list",
      style: "width:150px",
    });
    dojo.connect(listSelect, "onChange", function(evt) {
      grid.setStore(createListStore("list.php?".concat(url_param).concat("&filename=").concat(evt)));
    });
    // pre select main
    listSelect.set("value", "main.json");

    var addNewEntry = new dijit.form.Button({
      label: "Add new entry",
      onClick: function() {
        var myDialog = new ConfirmDialog({
          title: "Add new entry",
          content: [numberTextBox.domNode, nameTextBox.domNode],
          onExecute: function() {
            if (numberTextBox.isValid() && nameTextBox.isValid()) {
              var newItem = {timestamp: Date.now(), number: numberTextBox.get("value"), name: nameTextBox.get("value")};
              grid.store.newItem(newItem);
              grid.store.save();
            }
          }
        });
        myDialog.show();
      }
    });

    return [listSelect.domNode, addNewEntry.domNode, domConstruct.create("br"), grid.domNode]
  }

  function createWhitelist() {
    return createListX("dirname=whitelists");
  }

  function createBlacklist() {
    return createListX("dirname=blacklists");
  }

  function createTree() {  
    var treeData = {
      identifier: "id",
      label: "name",
      items: [
        { id: "root", name:"Root", func:null,
          children:[{_reference:"calllog"}, {_reference:"config"}, {_reference:"diag"}] 
        },
        { id: "calllog", name:"Caller Log", func:createCallerLogGrid},
        { id: "config", name:"Configuration", func:null,
          children:[
            {_reference:"config_phone"}, {_reference:"config_onlinecreds"},
            {_reference:"config_whitelists"}, {_reference:"config_blacklists"}
          ] 
        },
        { id: "config_phone", name:"Phone", func:createPhone},
        { id: "config_onlinecreds", name:"Online Credentials", func:createOnlineCredentials},
        { id: "config_whitelists", name:"Whitelists", func:createWhitelist},
        { id: "config_blacklists", name:"Blacklists", func:createBlacklist},
        { id: "diag", name:"Diagnostics", func:null,
          children:[{_reference:"diag_error_warn"}, {_reference:"diag_all"}] 
        },
        { id: "diag_error_warn", name:"Error/Warnings", func:createJournalErrorWarnGrid},
        { id: "diag_all", name:"All", func:createJournalAllGrid}
      ]
    };

    var treeStore = new dojo.data.ItemFileWriteStore({
      data:treeData
    });
    var treeModel = new dijit.tree.TreeStoreModel({
      id:"model",
      store:treeStore,
      childrenAttrs:["children"],
      query:{id:"root"}
    });
    var tree = new dijit.Tree({
      model:treeModel,
      persist:false,
      showRoot:false,
      onClick: function(item) {
        if (item.func[0] != null) {
          mainPane.set("content", item.func[0]());
        }
      }
    });
    return tree;
  }


  //
  // main
  //
  var appLayout = new dijit.layout.BorderContainer({
    design: "headline",
    style: "height: 100%; width: 100%;",
    gutters:true
  });

  var headerPane = new dijit.layout.ContentPane({
    region: "top",
    content: "Here comes the logo"
  });
  appLayout.addChild(headerPane);

  var menuPane = new dijit.layout.ContentPane({
    region: "left",
    style: "width: 180px",
    splitter:true,
    content: createTree()
  });
  appLayout.addChild(menuPane);
  var mainPane = new dijit.layout.ContentPane({
    region: "center",
    content: "Welcome to the callblocker UI"
  });
  appLayout.addChild(mainPane);

  var statusbarPane = new dijit.layout.ContentPane({
    region: "bottom",
    content: "Callblocker 0.0.3"
  });
  appLayout.addChild(statusbarPane);
  appLayout.placeAt(document.body);
  appLayout.startup();
});

