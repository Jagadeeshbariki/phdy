
export interface AboutUsItem {
  Phone: string;
  PLink: string;
  email: string;
  ELink: string;
  Instagram: string;
  ILink: string;
  YouTube: string;
  YLink: string;
}

export interface ExternalLink {
  Name: string;
  Link: string;
}

export interface AboutDevItem {
  Name: string;
  Link: string;
  Phone: string;
  WhatsAppLink: string;
  Mail: string;
  MailLink: string;
}

export interface FooterSection {
  AboutUs: AboutUsItem[];
  ExternalLinks: ExternalLink[];
  AboutDeveloper: AboutDevItem[];
}

export const FOOTER_DATA: FooterSection[] = [
    {
        "AboutUs":[
            {
                "Phone":"+91 6300963789",
                "PLink":"https://wa.me/916300963789?text=I%20am%20interested%20to%20Join%20Your%20Group",
                "email":"peddaharivanamdevelopmentyouth@gmail.com",
                "ELink":"mailto:vyomanautjagadeesh@gmail.com",
                "Instagram":"Pedda Harivanam Development youth",
                "ILink":"https://www.instagram.com/peddaharivanamdevelopmentyouth/",
                "YouTube":"Village Governence - Pedda Harivanam",
                "YLink":"https://www.youtube.com/@peddaharivanam"
            }
        ],
        "ExternalLinks":[
            {
                "Name":"RTI",
                "Link":"https://rtionline.gov.in/"
            },
            {
                "Name":"Raise a Complaint",
                "Link":"https://meekosam.ap.gov.in/"
            },
            {
                "Name":"Revenue Department",
                "Link":"https://meebhoomi.ap.gov.in/"
            }
        ],
        "AboutDeveloper":[
            {
                "Name":"Jagadeesh IT Solutions",
                "Link":"https://barikijagadeesh.github.io/JagaIt/",
                "Phone":"+91 6300963789",
                "WhatsAppLink":"https://wa.me/916300963789?text=I%20need%20a%20website%20for%20my%20Business",
                "Mail":"vyomanautjagadeesh@gmail.com",
                "MailLink":"mailto:vyomanautjagadeesh@gmail.com?subject=Website Inquiry&body=I%20need%20a%20website%20for%20my%20business."
            }
        ]
    }
];
