/* eslint-disable react/no-danger */
import Link from 'next/link';
import Head from 'next/head';
import Prismic from '@prismicio/client';
import ptBR from 'date-fns/locale/pt-BR';
import { format } from 'date-fns';
import { RichText } from 'prismic-dom';
import { useRouter } from 'next/router';
import { GetStaticPaths, GetStaticProps } from 'next';
import { FiCalendar, FiClock, FiUser } from 'react-icons/fi';
import { getPrismicClient } from '../../services/prismic';

import Comments from '../../components/Comments';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

interface Post {
  first_publication_date: string | null;
  last_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
  preview: boolean;
  navigation: {
    prevPost: {
      uid: string;
      data: {
        title: string;
      };
    } | null;
    nextPost: {
      uid: string;
      data: {
        title: string;
      };
    } | null;
  };
}

export default function Post({
  post,
  preview,
  navigation,
}: PostProps): JSX.Element {
  const router = useRouter();

  if (router.isFallback) {
    return <h1>Carregando...</h1>;
  }

  const formattedDates = {
    first_publication_date: format(
      new Date(post.first_publication_date),
      'dd MMM yyyy',
      {
        locale: ptBR,
      }
    ),
    edittedAt:
      post.first_publication_date !== post.last_publication_date
        ? format(
            new Date(post.last_publication_date),
            `dd MMM yyyy', às' HH:ss`,
            {
              locale: ptBR,
            }
          )
        : null,
  };

  const numberOfWords = post.data.content
    .map(subsection => {
      const numberOfWordsOfHeading = subsection.heading
        ? subsection.heading.split(' ').length
        : 0;

      const numberOfWordsOfBody = subsection.body
        .map(contentBody =>
          contentBody.text ? contentBody.text.split(' ').length : 0
        )
        .reduce((acc, current) => acc + current);

      return numberOfWordsOfHeading + numberOfWordsOfBody;
    })
    .reduce((acc, current) => acc + current);

  const readingTime = Math.ceil(numberOfWords / 200);

  return (
    <>
      <Head>
        <title> {post.data.title} | Spacetraveling</title>
      </Head>
      <main>
        <img
          src={post.data.banner.url}
          alt="banner"
          className={styles.banner}
        />
        <div className={commonStyles.container}>
          <article className={styles.content}>
            <h1>{post.data.title}</h1>

            <div className={styles.postsInfo}>
              <div className={styles.mainInfo}>
                <FiCalendar />
                <time>{formattedDates.first_publication_date}</time>
                <FiUser />
                <span>{post.data.author}</span>
                <FiClock />
                <time>{readingTime} min</time>
              </div>
              {formattedDates.edittedAt && (
                <em>* editado em {formattedDates.edittedAt}</em>
              )}
            </div>

            {post.data.content.map(content => {
              return (
                <div key={content.heading}>
                  <h2>{content.heading}</h2>
                  <div
                    dangerouslySetInnerHTML={{
                      __html: RichText.asHtml(content.body),
                    }}
                  />
                </div>
              );
            })}
          </article>

          <hr className={styles.divider} />

          <nav className={styles.navigation}>
            <div>
              {navigation.prevPost && (
                <>
                  <h3>{navigation.prevPost.data.title}</h3>
                  <Link href={`/post/${navigation.prevPost.uid}`}>
                    <a>Post anterior</a>
                  </Link>
                </>
              )}
            </div>

            <div>
              {navigation.nextPost && (
                <>
                  <h3>{navigation.nextPost.data.title}</h3>
                  <Link href={`/post/${navigation.nextPost.uid}`}>
                    <a>Próximo post</a>
                  </Link>
                </>
              )}
            </div>
          </nav>

          <Comments />

          {preview && (
            <aside>
              <Link href="/api/exit-preview">
                <a className={commonStyles.preview}>Sair do modo Preview</a>
              </Link>
            </aside>
          )}
        </div>
      </main>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query(
    Prismic.Predicates.at('document.type', 'posts'),
    {
      pageSize: 2,
    }
  );

  const paths = posts.results.map(post => {
    return {
      params: {
        slug: post.uid,
      },
    };
  });

  return {
    paths,
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = async ({
  params,
  preview = false,
  previewData,
}) => {
  const prismic = getPrismicClient();
  const { slug } = params;
  const response = await prismic.getByUID('posts', String(slug), {
    ref: previewData?.ref || null,
  });

  const post = {
    uid: response.uid,
    first_publication_date: response.first_publication_date,
    last_publication_date: response.last_publication_date,
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      banner: {
        url: response.data.banner.url,
      },
      author: response.data.author,
      content: response.data.content.map(content => {
        return {
          heading: content.heading,
          body: [...content.body],
        };
      }),
    },
  };

  const prevPost = await prismic.query(
    Prismic.Predicates.at('document.type', 'posts'),
    {
      pageSize: 1,
      after: response.id,
      orderings: '[document.first_publication_date]',
    }
  );

  const nextPost = await prismic.query(
    Prismic.Predicates.at('document.type', 'posts'),
    {
      pageSize: 1,
      after: response.id,
      orderings: '[document.first_publication_date desc]',
    }
  );

  const navigation = {
    prevPost: prevPost.results[0] ?? null,
    nextPost: nextPost.results[0] ?? null,
  };

  return {
    props: {
      post,
      preview,
      navigation,
    },
    revalidate: 60 * 30, // 30 minutes
  };
};
