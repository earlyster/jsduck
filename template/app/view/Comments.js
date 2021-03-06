/**
 * View for rendering comments.
 */
Ext.define('Docs.view.Comments', {
    singleton: true,
    requires: [
        'Docs.view.auth.LoginHelper',
        // WTF!
        // When I don't add this line then "sencha create jsb" command
        // will fail.  But this class shouldn't require that class,
        // and indeed, when running in browser, the app will work just
        // fine, but when doing e.g. "rake gem" something goes wrong
        // and the "sencha create jsb" command just hangs.
        'Docs.view.auth.Login',
        'Docs.view.comments.Form'
    ],

    constructor: function() {
        var numComments = [
            '<tpl if="num &gt; 0">',
                'View {[values.num == 1 ? "1 comment" : values.num + " comments"]}',
            '</tpl>',
            '<tpl if="num == 0">',
                'No comments. Click to add',
            '</tpl>'
        ];

        this.numCommentsTpl = Ext.create('Ext.XTemplate',
            numComments.join('')
        );

        var commentsMeta = [
            '<div class="comments-div first-child" id="comments-{id}">',
                '<a href="#" class="side toggleComments"><span></span></a>',
                '<a href="#" class="name toggleComments">', numComments.join(''), '</a>',
            '</div>'
        ];

        this.loadingTpl = Ext.create('Ext.Template',
            '<div class="loading">Loading...</div>'
        );

        this.classCommentsTpl = Ext.create('Ext.XTemplate',
            '<div class="comments-section">',
                '<h3 class="members-title icon-comment">Comments</h3>',
                commentsMeta.join(''),
            '</div>'
        );
        this.commentsMetaTpl = Ext.create('Ext.XTemplate', commentsMeta.join(''));

        this.memberCommentsTpl = Ext.create('Ext.Template',
            '<span class="toggleMemberComments">{0}</span>'
        );

        var commentTplHtml = [
            '<div class="comment" id="{id}">',
                '<div class="com-meta">',
                    '<img class="avatar" width="25" height="25" src="http://www.gravatar.com/avatar/{emailHash}',
                          '?s=25&amp;r=PG&amp;d=http://www.sencha.com/img/avatar.png">',
                    '<div class="author<tpl if="moderator"> moderator" title="Sencha Engineer</tpl>">',
                        '{author}',
                        '<tpl if="showCls">',
                            '<span class="target"> on {[this.target(values.target)]}</span>',
                        '</tpl>',
                    '</div>',
                    '<tpl if="this.isMod()">',
                        '<a href="#" class="readComment <tpl if="read">read</tpl>">Read</a>',
                    '</tpl>',
                    '<tpl if="this.isMod() || this.isAuthor(values.author)"><a href="#" class="editComment">Edit</a><a href="#" class="deleteComment">Delete</a></tpl>',
                    '<div class="time" title="{[this.date(values.createdAt)]}">{[this.dateStr(values.createdAt)]}</div>',
                    '<div class="vote">',
                        '<a href="#" class="voteCommentUp{[values.upVote ? " selected" : ""]}" title="Vote Up">&nbsp;</a>',
                        '<span class="score">{score}</span>',
                        '<a href="#" class="voteCommentDown{[values.downVote ? " selected" : ""]}" title="Vote Down">&nbsp;</a>',
                    '</div>',
                '</div>',
                '<div class="content">{contentHtml}</div>',
            '</div>'
        ];

        var commentTplMethods = {
            dateStr: function(date) {
                try {
                    var now = Math.ceil(Number(new Date()) / 1000);
                    var comment = Math.ceil(Number(new Date(date)) / 1000);
                    var diff = now - comment;

                    if (diff < 60) {
                        return 'just now';
                    }
                    else if (diff < 60*60) {
                        var str = String(Math.round(diff / (60)));
                        return str + (str == "1" ? ' minute' : ' minutes') + ' ago';
                    }
                    else if (diff < 60*60*24) {
                        var str = String(Math.round(diff / (60*60)));
                        return str + (str == "1" ? ' hour' : ' hours') + ' ago';
                    }
                    else if (diff < 60*60*24*31) {
                        var str = String(Math.round(diff / (60 * 60 * 24)));
                        return str + (str == "1" ? ' day' : ' days') + ' ago';
                    }
                    else {
                        return Ext.Date.format(new Date(date), 'jS M \'y');
                    }
                } catch(e) {
                    return '';
                }
            },
            date: function(date) {
                try {
                    return Ext.Date.format(new Date(date), 'jS F Y g:ia');
                } catch(e) {
                    return '';
                }
            },
            isMod: function() {
                return Docs.App.getController('Auth').currentUser.mod;
            },
            isAuthor: function(author) {
                return Docs.App.getController('Auth').currentUser.userName == author;
            },
            target: function(target) {
                var url = target[1],
                    title = target[1],
                    urlPrefix = '#!/api/';

                if (target[0] == 'video') {
                    title = 'Video ' + title;
                    urlPrefix = '#!/video/';
                } else if (target[0] == 'guide') {
                    title = 'Guide ' + title;
                    urlPrefix = '#!/guide/';
                } else if (target[2] != '') {
                    url += '-' + target[2];
                    if (target[0] == "class") {
                        title += '#' + target[2].replace(/^.*-/, "");
                    }
                    else {
                        title += ' ' + target[2];
                    }
                }

                return '<a href="' + urlPrefix + url + '">' + title + '</a>';
            },
            recentCommentsPager: Ext.Function.bind(function(values) {
                var last = values[values.length - 1];
                if (last && last.total_rows) {
                    return [
                        '<div class="recent-comments-pager">',
                        this.getPagerHtml(last),
                        '</div>'
                    ].join('');
                }
                else {
                    return '';
                }
            }, this)
        };

        this.commentsTpl = Ext.create('Ext.XTemplate',
            '<div class="comment-list">',
                '<tpl for=".">',
                    commentTplHtml.join(''),
                '</tpl>',
                '<div class="new-comment-wrap"></div>',
            '</div>',
            '{[this.recentCommentsPager(values)]}',
            commentTplMethods
        );

        this.appendCommentsTpl = Ext.create('Ext.XTemplate',
            '<tpl for=".">',
                commentTplHtml.join(''),
            '</tpl>',
            commentTplMethods
        );

        this.commentTpl = Ext.create('Ext.XTemplate',
            commentTplHtml.join(''),
            commentTplMethods
        );
    },

    /**
     * Returns HTML for recent comments pager.
     *
     * @param {Object} opts Object with fields:
     * @param {Number} opts.offset
     * @param {Number} opts.limit
     * @param {Number} opts.total_rows
     */
    getPagerHtml: function(opts) {
        var total = opts.total_rows || 0;
        var loaded = opts.offset + opts.limit;
        var next_load = Math.min(opts.limit, total - loaded);

        if (total > loaded) {
            return [
                '<span></span>',
                '<a href="#" class="fetchMoreComments" rel="' + loaded + '">',
                    'Showing comments 1-' + loaded + ' of ' + total + '. ',
                    'Click to load ' + next_load + ' more...',
                '</a>'
            ].join('');
        } else {
            return '<span></span>That\'s all. Total '+total+' comments.';
        }
    },

    /**
     * Renders the comment containers for the currently active class
     */
    renderClassCommentContainers: function(cls) {
        // Add comment button to class toolbar
        this.getClassToolbar().showCommentCount();

        // Insert class level comment container under class intro docs
        this.classCommentsTpl.insertFirst(Ext.query('.members')[0], {
            num: 0,
            id: 'class-' + cls.name.replace(/\./g, '-')
        });

        // Add a comment container to each class member
        Ext.Array.each(Ext.query('.member .long'), function(memberDoc) {
            var id = Ext.get(memberDoc).up('.member').getAttribute('id');
            this.commentsMetaTpl.append(memberDoc, {
                num: 0,
                id: 'class-' + cls.name.replace(/\./g, '-') + '-' + id.replace(/\./g, '-')
            });
        }, this);
    },

    /**
     * Updates the comment meta information (i.e. number of comments) on a class page
     */
    updateClassCommentMeta: function(cls) {
        var clsMeta = Docs.commentMeta['class'][cls];

        if (clsMeta && clsMeta['']) {

            // Update toolbar icon
            this.getClassToolbar().setCommentCount(clsMeta['']);

            // Update class level comments meta
            this.numCommentsTpl.overwrite(Ext.get(Ext.query('.comments-section a.name')[0]), {
                num: clsMeta['']
            });
        } else {
            // Update toolbar icon
            this.getClassToolbar().setCommentCount(0);

            // Update class level comments meta
            this.numCommentsTpl.overwrite(Ext.get(Ext.query('.comments-section a.name')[0]), {
                num: 0
            });
        }

        // Update class member comments meta
        Ext.Array.each(Ext.query('.member'), function(memberDom) {
            var memberEl = Ext.get(memberDom),
                memberId = memberEl.getAttribute('id'),
                memberCls = memberEl.down('.meta .defined-in').getAttribute('rel'),
                commentsWrap = memberEl.down('.comments-div a.name'),
                memberTitle = memberEl.down('.title'),
                numComments = Docs.commentMeta['class'][memberCls] && Docs.commentMeta['class'][memberCls][memberId],
                memberTitleComments = memberTitle.down('.toggleMemberComments');

            if (numComments) {
                this.numCommentsTpl.overwrite(commentsWrap, {
                    num: numComments
                });

                if (memberTitleComments) {
                    memberTitleComments.update(String(numComments));
                } else {
                    this.memberCommentsTpl.append(memberTitle, [numComments]);
                }
            } else {
                if (memberTitleComments) memberTitleComments.remove();
            }

        }, this);

        this.updateClassIndex();
        Ext.Array.each(Ext.ComponentQuery.query('hovermenu'), function(m) {
            m.fireEvent('refresh', this);
        });
    },

    getClassToolbar: function() {
        return Ext.ComponentQuery.query('classoverview toolbar')[0];
    },

    updateGuideCommentMeta: function(guide) {
        var guideMeta = Docs.commentMeta['guide'][guide];

        this.numCommentsTpl.overwrite(Ext.get(Ext.query('#guide .comments-section a.name')[0]), {
            num: guideMeta && guideMeta[''] ? guideMeta[''] : 0
        });
    },

    updateVideoCommentMeta: function(video) {
        var videoMeta = Docs.commentMeta['video'][video];

        this.numCommentsTpl.overwrite(Ext.get(Ext.query('#video .comments-section a.name')[0]), {
            num: videoMeta && videoMeta[''] ? videoMeta[''] : 0
        });
    },

    renderHoverMenuMeta: function(cmp) {
        Ext.Array.each(cmp.query('a.docClass'), function(a) {
            var rel = "comments-class-" + a.getAttribute('rel').replace(/[^A-Za-z\-]/g, '-'),
                relEl = Ext.get(a),
                memberComments = relEl.down('.toggleMemberComments'),
                key = Docs.commentMeta.idMap[rel];

            if (key && Docs.commentMeta[key[0]] && Docs.commentMeta[key[0]][key[1]]) {
                var meta = Docs.commentMeta[key[0]][key[1]][key[2]];

                if (memberComments) {
                    if (!meta) {
                        memberComments.remove();
                    } else {
                        memberComments.update(String(meta));
                    }
                } else if (meta) {
                    this.memberCommentsTpl.append(a, [meta || 0]);
                }
            }
        }, this);
    },

    /**
     * Update the Class index with number of comments on each class
     */
    updateClassIndex: function() {
        for(var cls in Docs.commentMeta['class']) {
            var clsEl = Ext.get(Ext.query('#classindex a[rel="' + cls + '"]')[0]);
            if (clsEl) {
                var existingMeta = clsEl.down('.toggleMemberComments');
                if (existingMeta) {
                    existingMeta.update(String(Docs.commentMeta['class'][cls]['total']));
                } else {
                    Docs.view.Comments.memberCommentsTpl.append(clsEl, [String(Docs.commentMeta['class'][cls]['total'])]);
                }
            }
        }
    },

    renderNewCommentForms: function() {
        var currentUser = Docs.App.getController('Auth').currentUser;

        Ext.Array.each(Ext.query('.new-comment-wrap'), function(newComment) {
            var hideCommentForm = Ext.get(newComment).up('.comment-list').parent().hasCls('hideCommentForm');
            var memInfo = this.extractMemberInfo(newComment);

            if (hideCommentForm) {
                // Do nothing
            } else if (Docs.App.getController('Auth').isLoggedIn()) {
                new Docs.view.comments.Form({
                    renderTo: newComment,
                    definedIn: memInfo.definedIn,
                    user: currentUser
                });
            } else {
                Docs.view.auth.LoginHelper.renderToComments(newComment);
            }
        }, this);
    },

    /**
     * Given an HTML element, determines the member it's in and if the
     * member is inherited.  If it's inherited, returns hash with
     * `{definedIn: "className"}`.  Otherwise just returns empty hash.
     * The definedIn value is used inside template to print a notice
     * about posting a possible out-of-context comment.
     */
    extractMemberInfo: function(el) {
        var info = {};
        var member = Ext.get(el).up(".member");
        if (member && member.hasCls("inherited")) {
            info.definedIn = member.down(".defined-in").getHTML();
        }
        return info;
    },

    showMember: function(cls, member) {
        var memberEl = Ext.get(member).down('.long'),
            id = ('class-' + cls + '-' + member).replace(/\./g, '-');

        if (!memberEl.hasCls('renderedComment')) {
            this.commentsMetaTpl.append(memberEl, {
                num: 0,
                id: id
            });
            memberEl.addCls('renderedComment');
            Docs.App.getController('CommentsMeta').commentIdMap['comments-' + id] = ['class', cls, member];
        }
    }
});
