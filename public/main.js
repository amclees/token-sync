(function() {
  'use strict';

  var app = angular.module('token-sync', ['firebase']);

  app.directive('contenteditable', function() {
    return {
      restrict: 'A',
      require: 'ngModel',
      link: function(scope, element, attributes, ngModel) {
        scope.$watch(attributes.ngModel, function() {
          scope.members.$save(scope.member);
        });

        var setViewValue = function() {
          var elementHTML = element.html();
          if (elementHTML.indexOf('<') !== -1) {
            element.html(elementHTML.replace(/<.*>/g, ''));
          }
          ngModel.$setViewValue(element.html());
        };

        ngModel.$render = function() {
          element.html(ngModel.$viewValue || '');
        };

        element.bind('blur keyup', function($event) {
          scope.$apply(setViewValue);
        });
      }
    };
  });

  app.controller('TokenSyncController',
    [
      '$scope', '$firebase', '$firebaseAuth', '$firebaseObject', '$firebaseArray',
      function($scope, $firebase, $firebaseAuth, $firebaseObject, $firebaseArray) {
        function initialize() {
          $scope.roomsRef = firebase.database().ref('rooms');
          $scope.roomArraysRef = firebase.database().ref('roomArrays');
          $scope.roomOwnersRef = firebase.database().ref('roomOwners');
          $scope.authObj = $firebaseAuth();
          $scope.actionInProgress = false;
        }

        initialize();

        $scope.logIn = function(provider) {
          $scope.actionInProgress = true;
          if (!provider) {
            provider = 'google';
          }
          $scope.authObj.$signInWithPopup(provider).then(function(authData) {
            $scope.authData = authData;
            $scope.getExistingRooms();
          }, function(error) {
             console.error('Login failed: ', error);
          });
        };

        $scope.logOut = function() {
          $scope.actionInProgress = true;
          if ($scope.room) {
            $scope.leaveRoom();
          }
          $scope.existingRooms.$destroy();
          $scope.room = null;
          $scope.inviteCode = null;
          $scope.roomName = null;
          $scope.tokenName = null;
          $scope.newMemberName = null;
          $scope.newMemberTokens = null;
          $scope.inviteCode = null;
          $scope.inviteCodeInput = '';
          $scope.authObj.$signOut().then(function() {
            $scope.authData = null;
            $scope.actionInProgress = false;
          });
        };

        $scope.getExistingRooms = function() {
          $scope.actionInProgress = true;
          $scope.userRoomsRef = $scope.roomsRef.child($scope.authData.user.uid);
          $scope.existingRooms = $firebaseObject($scope.userRoomsRef);
          $scope.actionInProgress = false;
        };

        $scope.joinRoomIfExists = function(roomId, callback) {
          var joined = false;
          $scope.actionInProgress = true;

          $scope.roomOwnersRef.child(roomId).once('value', function(owner) {
            if (owner.val() === null) {
              if (callback) {
                callback(false);
              }
              return;
            }

            $scope.roomsRef.child(owner.val().id).once('value', function(snapshot) {
              if (snapshot.val() !== null) {
                $scope.currentUserIsOwner = owner.val().id === $scope.authData.user.uid;
                $scope.roomRef = $scope.roomsRef.child(owner.val().id).child(roomId);
                $scope.roomObject = $firebaseObject($scope.roomRef);
                $scope.roomObject.$bindTo($scope, 'room');

                $scope.roomArrayRef = $scope.roomArraysRef.child(roomId);

                $scope.membersRef = $scope.roomArrayRef.child('members');
                $scope.members = $firebaseArray($scope.membersRef);

                $scope.usersRef = $scope.roomArrayRef.child('users');
                $scope.users = $firebaseArray($scope.usersRef);

                joined = true;
              }
              $scope.actionInProgress = false;
              $scope.$apply();
              setTimeout(function() {
                if (joined) {
                  document.title = $scope.room.name + ' Token Sync';
                  $scope.users.$add({
                    displayName: $scope.authData.user.displayName,
                    uid: $scope.authData.user.uid
                  });
                  $scope.$apply();
                }
              }, 100);
              if (callback) {
                callback(joined);
              }
            });
          });
        };

        $scope.showInviteCode = function() {
          $scope.inviteCode = $scope.room.id;
        };

        $scope.createRoom = function() {
          $scope.actionInProgress = true;
          $scope.roomRef = $scope.roomsRef.child($scope.authData.user.uid).push();
          var room = $firebaseObject($scope.roomRef);
          room.id = $scope.roomRef.key;
          room.name = $scope.roomName;
          room.tokenName = $scope.tokenName;
          room.$save();

          $scope.roomArrayRef = $scope.roomArraysRef.child(room.id);

          $scope.membersRef = $scope.roomArrayRef.child('members');
          $scope.members = $firebaseArray($scope.membersRef);

          $scope.usersRef = $scope.roomArrayRef.child('users');
          $scope.users = $firebaseArray($scope.usersRef);

          $scope.roomOwnersRef.child(room.id).set({
            'id': $scope.authData.user.uid
          });
          $scope.roomName = '';
          $scope.tokenName = '';
          $scope.actionInProgress = false;
        };

        $scope.deleteRoom = function () {
          $scope.roomOwnersRef.child($scope.room.id).remove();
          $scope.leaveRoom();
          $scope.roomRef.remove();
        };

        $scope.leaveRoom = function() {
          if ($scope.users) {

            var safety = 0,
                safetyMax = 1000;

            var deleteDuplicate = function() {
              if(safety++ >= safetyMax) {
                  return;
              }
              for (var i = 0; i < $scope.users.length; i++) {
                if($scope.users[i].uid === $scope.authData.user.uid) {
                  $scope.users.$remove(i).then(function() {
                    deleteDuplicate();
                  });
                  return;
                }
              }
              $scope.users.$destroy();
            };

            deleteDuplicate();
          }
          $scope.roomObject.$destroy();
          $scope.inviteCode = null;
          $scope.room = null;
          $scope.currentUserIsOwner = null;
          $scope.invalidInviteWarning = false;
          document.title = 'Token Sync';
        };

        $scope.addNewMember = function() {
          $scope.members.$add({
            name: $scope.newMemberName,
            tokens: $scope.newMemberTokens,
            owner: {
              displayName: 'None',
              uid: ''
            },
            public: false
          });
          $scope.newMemberName = '';
          $scope.newMemberTokens = '';
        };

        $scope.duplicateMember = function(member) {
          $scope.members.$add({
            name: member.name,
            tokens: member.tokens,
            owner: {
              displayName: member.owner.displayName,
              uid: member.owner.uid
            },
            public: member.public
          });
        };

        $scope.incrementTokens = function(member, increment) {
          if (!isNaN(Number(member.tokens))) {
            member.tokens = '' + (Number(member.tokens) + increment);
            $scope.members.$save(member);
          }
        };

        $scope.joinByInvite = function() {
          $scope.joinRoomIfExists($scope.inviteCodeInput, function(joined) {
            if (joined) {
              $scope.inviteCodeInput = '';
              $scope.invalidInviteWarning = false;
            } else {
              $scope.invalidInviteWarning = true;
            }
          });
        };

        $scope.removeUser = function(user) {
          $scope.users.$remove(user);
        };
      }
    ]
  );
})();
