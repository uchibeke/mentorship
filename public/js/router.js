App.Router.map(function() {
  this.route("settings", { path: "/settings/:user_id" });
  this.resource("tickets", function() {
    this.route("closed")
  });
  this.resource("ticket", {path: "/tickets/:ticket_id"});
});

App.SettingsRoute = Ember.Route.extend({
  model: function(params) {
    console.log(params.user_id);
    var id = this.store.createRecord("user", {
      phoneNumer: "8312123900",
      name: "Raphie"
    });
    console.log(id);
    return null; //this.store.find("user", params.user_id);
  }
});

App.IndexRoute = Ember.Route.extend({
  redirect: function() {
      this.transitionTo("tickets");
  }
});

App.TicketsRoute = Ember.Route.extend({
  model: function() {
    return this.store.find("ticket");
  }
});

App.TicketsIndexRoute = Ember.Route.extend({
  model: function() {
    return this.store.filter("ticket", function(ticket) {
      return ticket.get("open");
    });
  },
  setupController: function(controller, model) {
    controller.set("model", model);
    controller.set("open", true);
  }
});

App.TicketsClosedRoute = Ember.Route.extend({
  model: function() {
    return this.store.filter("ticket", function(ticket) {
      return !ticket.get("open");
    });
  },
  renderTemplate: function(controller) {
    this.render("tickets/index", {controller: controller});
  },
  setupController: function(controller, model) {
    controller.set("model", model);
    controller.set("open", false);
  }
});